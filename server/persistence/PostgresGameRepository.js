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
    this.poolError = null;
    this.onConnectionError = null;
  }

  async resetPool() {
    const pool = this.pool;
    this.pool = null;
    this.initPromise = null;
    if (!pool) return;

    try {
      await pool.end();
    } catch {
      // Best-effort shutdown; connection loss is already being handled.
    }
  }

  async ensureReady() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const { Pool } = await import("pg");
        this.pool = new Pool(this.connectionConfig);
        this.poolError = null;
        this.pool.on("error", async error => {
          this.poolError = error;
          this.onConnectionError?.(error);
          await this.resetPool();
        });
        await this.pool.query(`SET search_path TO ${this.schema}`);

        if (this.schemaPath) {
          const schemaSql = await fs.readFile(this.schemaPath, "utf8");
          await this.pool.query(schemaSql);
        }
      } catch (error) {
        this.poolError = error;
        await this.resetPool();
        throw error;
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

    await this.pool.query(
      `
        INSERT INTO rooms (
          id, room_type, ruleset, status, host_player_id, current_turn, next_action, winner,
          snapshot_json, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz, $11::timestamptz)
        ON CONFLICT (id) DO UPDATE SET
          room_type = EXCLUDED.room_type,
          ruleset = EXCLUDED.ruleset,
          status = EXCLUDED.status,
          host_player_id = EXCLUDED.host_player_id,
          current_turn = EXCLUDED.current_turn,
          next_action = EXCLUDED.next_action,
          winner = EXCLUDED.winner,
          snapshot_json = EXCLUDED.snapshot_json,
          updated_at = EXCLUDED.updated_at
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
        SELECT id, room_type, ruleset, status, updated_at, snapshot_json
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
          updated_at
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

  async close() {
    await this.resetPool();
  }

  setConnectionErrorHandler(handler) {
    this.onConnectionError = typeof handler === "function" ? handler : null;
  }
}
