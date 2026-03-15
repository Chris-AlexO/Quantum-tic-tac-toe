# Persistence Scaffold

This folder intentionally provides a database seam without wiring it into runtime yet.

Current pieces:

- `schema.sql`: PostgreSQL schema intended for Amazon RDS for PostgreSQL.
- `NoopGameRepository.js`: safe default used until persistence is integrated.
- `PostgresGameRepository.js`: Amazon RDS/PostgreSQL-oriented repository with the same surface the game code will eventually consume.
- `createGameRepository.js`: factory for selecting a repository by environment variable.

Suggested first integration points later:

1. `createRoom`
2. `enterRoom` / spectator joins
3. `clientReady`
4. `move`
5. `collapse`
6. `rematch`
7. `disconnect`

Recommended runtime contract:

- Treat the database as a projection of in-memory room state at first.
- Keep Socket.IO room state authoritative until you are ready to build resume/recovery from persisted snapshots.
- Keep the repository surface stable:
  - `syncRoom(room)`
  - `syncPlayerPresence(player, context)`
  - `clearPlayerPresence(playerId)`
  - `getRoomSnapshot(roomId)`
  - `listActiveRooms()`

Recommended Amazon RDS setup:

- Engine: PostgreSQL
- Driver: `pg`
- Environment:
  - `QTTT_DB_DRIVER=postgres`
  - `QTTT_DB_URL=postgresql://...`
    or
  - `QTTT_DB_HOST=...`
  - `QTTT_DB_PORT=5432`
  - `QTTT_DB_NAME=...`
  - `QTTT_DB_USER=...`
  - `QTTT_DB_PASSWORD=...`
  - `QTTT_DB_SSL_MODE=require`
  - `QTTT_DB_SCHEMA=public`

Notes:

- This scaffold is still intentionally not integrated into room creation, move handling, or resume logic.
- The repository lazy-loads `pg`, so the app can still run without the database dependency until you wire it in.
