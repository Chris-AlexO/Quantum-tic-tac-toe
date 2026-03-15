import path from "node:path";

import { NoopGameRepository } from "./NoopGameRepository.js";
import { PostgresGameRepository } from "./PostgresGameRepository.js";

export function createGameRepository({
  driver = process.env.QTTT_DB_DRIVER || (process.env.NODE_ENV === "test" ? "noop" : "postgres"),
  connectionString = process.env.QTTT_DB_URL,
  host = process.env.QTTT_DB_HOST,
  port = process.env.QTTT_DB_PORT,
  database = process.env.QTTT_DB_NAME,
  user = process.env.QTTT_DB_USER,
  password = process.env.QTTT_DB_PASSWORD,
  sslMode = process.env.QTTT_DB_SSL_MODE || (process.env.NODE_ENV === "production" ? "require" : "disable"),
  schema = process.env.QTTT_DB_SCHEMA || "public",
} = {}) {
  if (driver === "postgres") {
    return new PostgresGameRepository({
      connectionString,
      host,
      port,
      database,
      user,
      password,
      sslMode,
      schema,
      schemaPath: path.join(process.cwd(), "server", "persistence", "schema.sql"),
    });
  }

  return new NoopGameRepository();
}
