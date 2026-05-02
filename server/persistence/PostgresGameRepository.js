import fs from "node:fs/promises";

import {
  deleteRoomsByIds,
  getRoomSnapshot,
  listActiveRooms,
  listRooms,
  syncParticipants,
  syncRoom
} from "./queries/roomQueries.js";
import {
  clearOrphanedReferences,
  clearPlayerPresence,
  getPlayerPresence,
  listPlayers,
  syncPlayerPresence
} from "./queries/playerQueries.js";
import {
  clearLocalGameSnapshot,
  getLocalGameSnapshot,
  saveLocalGameSnapshot
} from "./queries/localGameQueries.js";
import { clearAllData, deleteExpiredRooms } from "./queries/expiryQueries.js";

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
    schemaPath = null
  } = {}) {
    this.connectionConfig = connectionString
      ? { connectionString, ssl: toSslConfig(sslMode) }
      : { host, port, database, user, password, ssl: toSslConfig(sslMode) };

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
          connectionTimeoutMillis: 2500
        });

        this.poolError = null;

        this.pool.on("error", error => {
          this.poolError = error;
          this.onConnectionError?.(error);
          void this.resetPool();
        });

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
    await syncRoom(this, room);
    await this.syncParticipants(room);
  }

  syncParticipants(room) {
    return syncParticipants(this, room);
  }

  syncPlayerPresence(player, context) {
    return syncPlayerPresence(this, player, context);
  }

  clearPlayerPresence(playerId) {
    return clearPlayerPresence(this, playerId);
  }

  saveLocalGameSnapshot(playerId, payload) {
    return saveLocalGameSnapshot(this, playerId, payload);
  }

  getLocalGameSnapshot(playerId) {
    return getLocalGameSnapshot(this, playerId);
  }

  clearLocalGameSnapshot(playerId) {
    return clearLocalGameSnapshot(this, playerId);
  }

  getRoomSnapshot(roomId) {
    return getRoomSnapshot(this, roomId);
  }

  getPlayerPresence(playerId) {
    return getPlayerPresence(this, playerId);
  }

  listActiveRooms() {
    return listActiveRooms(this);
  }

  listRooms(options) {
    return listRooms(this, options);
  }

  listPlayers(options) {
    return listPlayers(this, options);
  }

  deleteRoomsByIds(roomIds) {
    return deleteRoomsByIds(this, roomIds);
  }

  clearOrphanedReferences() {
    return clearOrphanedReferences(this);
  }

  deleteExpiredRooms(options) {
    return deleteExpiredRooms(this, options);
  }

  clearAllData() {
    return clearAllData(this);
  }

  async close() {
    await this.resetPool();
  }

  setConnectionErrorHandler(handler) {
    this.onConnectionError = typeof handler === "function" ? handler : null;
  }
}
