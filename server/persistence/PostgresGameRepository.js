import fs from "node:fs/promises";

import { serializeRoomState } from "../game/serializers.js";

function nowIso() {
  return new Date().toISOString();
}

function toSslConfig(sslMode) {
  if (!sslMode || sslMode === "disable") {
    return false;
  }

  if (sslMode === "require") {
    return { rejectUnauthorized: false };
  }

  return true;
}

export class PostgresGameRepository {
  constructor({
    connectionString = process.env.QTTT_DB_URL,
    host = process.env.QTTT_DB_HOST || "127.0.0.1",
    port = process.env.QTTT_DB_PORT ? Number(process.env.QTTT_DB_PORT) : 5432,
    database = process.env.QTTT_DB_NAME || "postgres",
    user = process.env.QTTT_DB_USER || "postgres",
    password = process.env.QTTT_DB_PASSWORD || "postgres",
    sslMode = process.env.QTTT_DB_SSL_MODE || (process.env.NODE_ENV === "production" ? "require" : "disable"),
    schema = process.env.QTTT_DB_SCHEMA || "public",
    schemaPath = null,
  } = {}) {
    this.connectionConfig = connectionString
      ? {
          connectionString,
          ssl: toSslConfig(sslMode),
        }
      : {
          host,
          port,
          database,
          user,
          password,
          ssl: toSslConfig(sslMode),
        };

    this.schema = schema;
    this.schemaPath = schemaPath;
    this.pool = null;
    this.initPromise = null;
    this.ready = false;
    this.poolError = null;
    this.onConnectionError = null;
  }

  async resetPool() {
    const pool = this.pool;
    this.pool = null;
    this.initPromise = null;
    this.ready = false;
    if (!pool) return;

    try {
      await pool.end();
    } catch {
      // Best-effort shutdown; connection loss is already being handled.
    }
  }

  async ensureReady() {
  if (this.ready) return;
  if (this.initPromise) return this.initPromise;

  this.initPromise = (async () => {
    try {
      const { Pool } = await import("pg");

      this.pool = new Pool({
        ...this.connectionConfig,
        connectionTimeoutMillis: 2500,
      });

      this.poolError = null;

      this.pool.on("error", (error) => {
        this.poolError = error;
        this.onConnectionError?.(error);
        void this.resetPool();
      });

      // Force an actual connection test early
      await this.pool.query("SELECT 1");

      if (this.schema) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.schema)) {
          throw new Error(`Invalid schema name: ${this.schema}`);
        }
        await this.pool.query(`SET search_path TO "${this.schema}"`);
      }

      if (this.schemaPath) {
        const schemaSql = await fs.readFile(this.schemaPath, "utf8");
        await this.pool.query(schemaSql);
      }

      this.ready = true;
    } catch (error) {
      this.poolError = error;
      await this.resetPool();
      throw error;
    } finally {
      this.initPromise = null;
    }
  })();

  return this.initPromise;
}

  async ping() {
    await this.ensureReady();
    if (!this.pool) {
      throw this.poolError ?? new Error("Database pool unavailable");
    }
    await this.pool.query("SELECT 1");
    return true;
  }

  async syncRoom(room) {
    await this.ensureReady();

    const snapshot = serializeRoomState(room);
    const now = nowIso();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await this.pool.query(
      `
        INSERT INTO rooms (
          id, room_type, ruleset, status, host_player_id, current_turn, next_action, winner,
          snapshot_json, created_at, updated_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz, $11::timestamptz, $12::timestamptz)
        ON CONFLICT (id) DO UPDATE SET
          room_type = EXCLUDED.room_type,
          ruleset = EXCLUDED.ruleset,
          status = EXCLUDED.status,
          host_player_id = EXCLUDED.host_player_id,
          current_turn = EXCLUDED.current_turn,
          next_action = EXCLUDED.next_action,
          winner = EXCLUDED.winner,
          snapshot_json = EXCLUDED.snapshot_json,
          updated_at = EXCLUDED.updated_at,
          expires_at = COALESCE(rooms.expires_at, EXCLUDED.expires_at)
      `,
      [
        snapshot.session.roomId,
        snapshot.session.type,
        snapshot.session.ruleset ?? "house",
        snapshot.session.status,
        snapshot.session.host ?? null,
        snapshot.game.turn ?? null,
        snapshot.game.nextAction ?? null,
        snapshot.game.winner ?? null,
        JSON.stringify(snapshot),
        now,
        now,
        expiresAt,
      ]
    );

    await this.syncParticipants(room);
  }

  async syncParticipants(room) {
    await this.ensureReady();

    const now = nowIso();
    const participants = [];

    for (const [mark, player] of Object.entries(room.players)) {
      if (!player?.playerId) continue;
      participants.push({
        roomId: room.roomId,
        playerId: player.playerId,
        role: "player",
        mark,
        joinedAt: now,
        updatedAt: now,
      });
    }

    for (const spectator of room.spectators ?? []) {
      if (!spectator?.playerId) continue;
      participants.push({
        roomId: room.roomId,
        playerId: spectator.playerId,
        role: "spectator",
        mark: null,
        joinedAt: now,
        updatedAt: now,
      });
    }

    for (const participant of participants) {
      await this.pool.query(
        `
          INSERT INTO room_participants (
            room_id, player_id, role, mark, joined_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
          ON CONFLICT (room_id, player_id) DO UPDATE SET
            role = EXCLUDED.role,
            mark = EXCLUDED.mark,
            updated_at = EXCLUDED.updated_at
        `,
        [
          participant.roomId,
          participant.playerId,
          participant.role,
          participant.mark,
          participant.joinedAt,
          participant.updatedAt,
        ]
      );
    }
  }

  async syncPlayerPresence(player, { roomId = null, role = null, mark = null } = {}) {
    await this.ensureReady();

    const now = nowIso();
    await this.pool.query(
      `
        INSERT INTO players (
          id, display_name, connection_status, active_room_id, active_role, active_mark, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          connection_status = EXCLUDED.connection_status,
          active_room_id = EXCLUDED.active_room_id,
          active_role = EXCLUDED.active_role,
          active_mark = EXCLUDED.active_mark,
          updated_at = EXCLUDED.updated_at
      `,
      [
        player.playerId,
        player.playerName ?? "Waiting...",
        player.connectionStatus ?? "online",
        roomId,
        role,
        mark,
        now,
      ]
    );
  }

  async clearPlayerPresence(playerId) {
    await this.ensureReady();

    await this.pool.query(
      `
        UPDATE players
        SET active_room_id = NULL, active_role = NULL, active_mark = NULL, updated_at = $1::timestamptz
        WHERE id = $2
      `,
      [nowIso(), playerId]
    );
  }

  async saveLocalGameSnapshot(playerId, {
    playerName = "Player X",
    snapshot = null
  } = {}) {
    await this.ensureReady();

    if (!playerId || !snapshot?.state) {
      throw new Error("A player id and local game snapshot are required.");
    }

    const roomId = `local:${playerId}`;
    const now = nowIso();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const session = snapshot.state.session ?? {};
    const game = snapshot.state.game ?? {};

    await this.pool.query(
      `
        INSERT INTO rooms (
          id, room_type, ruleset, status, host_player_id, current_turn, next_action, winner,
          snapshot_json, created_at, updated_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz, $11::timestamptz, $12::timestamptz)
        ON CONFLICT (id) DO UPDATE SET
          room_type = EXCLUDED.room_type,
          ruleset = EXCLUDED.ruleset,
          status = EXCLUDED.status,
          host_player_id = EXCLUDED.host_player_id,
          current_turn = EXCLUDED.current_turn,
          next_action = EXCLUDED.next_action,
          winner = EXCLUDED.winner,
          snapshot_json = EXCLUDED.snapshot_json,
          updated_at = EXCLUDED.updated_at,
          expires_at = COALESCE(rooms.expires_at, EXCLUDED.expires_at)
      `,
      [
        roomId,
        "local",
        session.ruleset ?? "house",
        session.status ?? "playing",
        playerId,
        game.turn ?? null,
        game.nextAction ?? null,
        game.winner ?? null,
        JSON.stringify(snapshot),
        now,
        now,
        expiresAt,
      ]
    );

    await this.pool.query(
      `
        INSERT INTO players (
          id, display_name, connection_status, active_room_id, active_role, active_mark, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          connection_status = EXCLUDED.connection_status,
          active_room_id = EXCLUDED.active_room_id,
          active_role = EXCLUDED.active_role,
          active_mark = EXCLUDED.active_mark,
          updated_at = EXCLUDED.updated_at
      `,
      [
        playerId,
        playerName,
        "online",
        roomId,
        "player",
        "X",
        now,
      ]
    );

    await this.pool.query(
      `
        INSERT INTO room_participants (
          room_id, player_id, role, mark, joined_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
        ON CONFLICT (room_id, player_id) DO UPDATE SET
          role = EXCLUDED.role,
          mark = EXCLUDED.mark,
          updated_at = EXCLUDED.updated_at
      `,
      [roomId, playerId, "player", "X", now, now]
    );

    return {
      status: "ok",
      roomId,
      expiresAt,
    };
  }

  async getLocalGameSnapshot(playerId) {
    await this.ensureReady();

    if (!playerId) {
      return null;
    }

    const roomId = `local:${playerId}`;
    const result = await this.pool.query(
      `
        SELECT snapshot_json
        FROM rooms
        WHERE id = $1
          AND room_type = 'local'
      `,
      [roomId]
    );

    return result.rows[0]?.snapshot_json ?? null;
  }

  async clearLocalGameSnapshot(playerId) {
    await this.ensureReady();

    if (!playerId) {
      return { status: "ok" };
    }

    const roomId = `local:${playerId}`;
    const now = nowIso();

    await this.pool.query(
      `
        DELETE FROM room_participants
        WHERE room_id = $1
      `,
      [roomId]
    );

    await this.pool.query(
      `
        UPDATE players
        SET
          active_room_id = NULL,
          active_role = NULL,
          active_mark = NULL,
          updated_at = $2::timestamptz
        WHERE id = $1
          AND active_room_id = $3
      `,
      [playerId, now, roomId]
    );

    await this.pool.query(
      `
        DELETE FROM rooms
        WHERE id = $1
          AND room_type = 'local'
      `,
      [roomId]
    );

    return {
      status: "ok",
      roomId,
    };
  }

  async getRoomSnapshot(roomId) {
    await this.ensureReady();

    const result = await this.pool.query(
      `
        SELECT snapshot_json
        FROM rooms
        WHERE id = $1
      `,
      [roomId]
    );

    return result.rows[0]?.snapshot_json ?? null;
  }

  async getPlayerPresence(playerId) {
    await this.ensureReady();

    const result = await this.pool.query(
      `
        SELECT
          p.id,
          p.display_name,
          p.connection_status,
          p.active_room_id,
          p.active_role,
          p.active_mark,
          p.updated_at,
          r.status AS room_status,
          r.room_type,
          r.snapshot_json
        FROM players p
        LEFT JOIN rooms r
          ON r.id = p.active_room_id
        WHERE p.id = $1
      `,
      [playerId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      displayName: row.display_name,
      connectionStatus: row.connection_status,
      activeRoomId: row.active_room_id,
      activeRole: row.active_role,
      activeMark: row.active_mark,
      updatedAt: row.updated_at,
      roomStatus: row.room_status,
      roomType: row.room_type,
      snapshot: row.snapshot_json ?? null,
    };
  }

  async listActiveRooms() {
    await this.ensureReady();

    const result = await this.pool.query(
      `
        SELECT id, room_type, ruleset, status, updated_at, expires_at, snapshot_json
        FROM rooms
        ORDER BY updated_at DESC
      `
    );

    return result.rows;
  }

  async listRooms({ limit = 25 } = {}) {
    await this.ensureReady();

    const result = await this.pool.query(
      `
        SELECT
          id,
          room_type,
          ruleset,
          status,
          host_player_id,
          current_turn,
          next_action,
          winner,
          updated_at,
          expires_at
        FROM rooms
        ORDER BY updated_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows;
  }

  async listPlayers({ limit = 50 } = {}) {
    await this.ensureReady();

    const result = await this.pool.query(
      `
        SELECT
          id,
          display_name,
          connection_status,
          active_room_id,
          active_role,
          active_mark,
          updated_at
        FROM players
        ORDER BY updated_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows;
  }

  async deleteRoomsByIds(roomIds = []) {
    await this.ensureReady();
    if (!roomIds.length) {
      return {
        deletedRoomCount: 0,
        deletedRoomIds: [],
      };
    }

    await this.pool.query(
      `
        DELETE FROM room_participants
        WHERE room_id = ANY($1::text[])
      `,
      [roomIds]
    );

    await this.pool.query(
      `
        UPDATE players
        SET
          active_room_id = NULL,
          active_role = NULL,
          active_mark = NULL,
          updated_at = $2::timestamptz
        WHERE active_room_id = ANY($1::text[])
      `,
      [roomIds, nowIso()]
    );

    await this.pool.query(
      `
        DELETE FROM rooms
        WHERE id = ANY($1::text[])
      `,
      [roomIds]
    );

    return {
      deletedRoomCount: roomIds.length,
      deletedRoomIds: roomIds,
    };
  }

  async clearOrphanedReferences() {
    await this.ensureReady();

    await this.pool.query(
      `
        DELETE FROM room_participants rp
        WHERE NOT EXISTS (
          SELECT 1
          FROM rooms r
          WHERE r.id = rp.room_id
        )
      `
    );

    await this.pool.query(
      `
        UPDATE players p
        SET
          active_room_id = NULL,
          active_role = NULL,
          active_mark = NULL,
          updated_at = $1::timestamptz
        WHERE p.active_room_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM rooms r
            WHERE r.id = p.active_room_id
          )
      `,
      [nowIso()]
    );
  }

  async deleteExpiredRooms({ limit = 500 } = {}) {
    await this.ensureReady();

    const result = await this.pool.query(
      `
        SELECT id
        FROM rooms
        WHERE expires_at <= NOW()
        ORDER BY expires_at ASC
        LIMIT $1
      `,
      [limit]
    );

    const expiredRoomIds = result.rows.map(row => row.id);
    const deletionResult = await this.deleteRoomsByIds(expiredRoomIds);
    await this.clearOrphanedReferences();

    return deletionResult;
  }

  async clearAllData() {
    await this.ensureReady();

    await this.pool.query("DELETE FROM room_participants");
    await this.pool.query("DELETE FROM rooms");
    await this.pool.query("DELETE FROM players");

    return { status: "ok" };
  }

  async close() {
    await this.resetPool();
  }

  setConnectionErrorHandler(handler) {
    this.onConnectionError = typeof handler === "function" ? handler : null;
  }
}
