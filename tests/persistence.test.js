import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGameRepository } from "../server/persistence/createGameRepository.js";
import { PostgresGameRepository } from "../server/persistence/PostgresGameRepository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("createGameRepository returns noop repository by default", () => {
  const repo = createGameRepository({ driver: "noop" });

  assert.deepEqual(repo.listActiveRooms(), []);
});

test("createGameRepository returns postgres repository when requested", () => {
  const repo = createGameRepository({
    driver: "postgres",
    host: "example.cluster-abcdefghijkl.eu-west-2.rds.amazonaws.com",
    port: 5432,
    database: "qttt",
    user: "app_user",
    password: "secret",
    sslMode: "disable",
  });

  assert.ok(repo instanceof PostgresGameRepository);
  assert.equal(repo.connectionConfig.host, "example.cluster-abcdefghijkl.eu-west-2.rds.amazonaws.com");
  assert.equal(repo.connectionConfig.port, 5432);
  assert.equal(repo.connectionConfig.database, "qttt");
  assert.equal(repo.connectionConfig.user, "app_user");
  assert.equal(repo.connectionConfig.ssl, false);
});

test("postgres schema uses RDS-friendly PostgreSQL types", async () => {
  const schemaPath = path.join(__dirname, "..", "server", "persistence", "schema.sql");
  const schema = await import("node:fs/promises").then(fs => fs.readFile(schemaPath, "utf8"));

  assert.match(schema, /JSONB NOT NULL/);
  assert.match(schema, /TIMESTAMPTZ NOT NULL/);
  assert.match(schema, /USING GIN\(snapshot_json\)/);
  assert.match(schema, /expires_at TIMESTAMPTZ/);
  assert.match(schema, /INTERVAL '7 days'/);
});
