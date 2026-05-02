# Quantum Tic-Tac-Toe

Quantum Tic-Tac-Toe with:

- local play
- live multiplayer rooms
- spectators
- rematch and draw requests
- PostgreSQL-backed room persistence
- a dev-only admin screen for database inspection

## Rulesets

This app supports two rulesets.

### House rules

- This is the default mode.
- When a cycle collapses, the resolving player chooses from the cycle symbols shown in the UI.
- Collapse resolution is intentionally more flexible and more "quantum-inspired" than the original published rules.
- Collapsed marks are stored as plain `X` / `O`.
- If both players complete a line at the same time, the result is a draw.

### Allan Goff rules

- This mode follows the original Quantum Tic-Tac-Toe rules more closely.
- A cycle collapse is treated as a two-outcome measurement.
- The resolving player chooses between the two placements of the cycle-closing move, rather than from the broader flexible collapse menu used in the house rules.
- Collapsed marks keep their move identity, for example `X1` or `O6`.
- If both players complete a line on the same collapse, the winner is the player whose winning line has the lower highest move number. If that is still tied, the app falls back to a draw.

## References

- [Wikipedia: Quantum tic-tac-toe](https://en.wikipedia.org/wiki/Quantum_tic-tac-toe)
- [Codentropy archive / Allan Goff overview](https://cqt.uwa.edu.au/)

## Architecture

The project is now split into three main layers:

- `client/`: the React SPA
- `server/`: the Express app, Socket.IO handlers, room management, and persistence
- `shared/`: framework-agnostic game helpers shared across runtime boundaries

### Frontend

The frontend is a React SPA built with Vite.

- Routing lives in [client/src/routes.jsx](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/client/src/routes.jsx)
- Screens live in [client/src/screens](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/client/src/screens)
- Reusable game UI lives in [client/src/components/game](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/client/src/components/game)
- Client-side orchestration lives in [client/src/game](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/client/src/game)
- Transport and API access live in [client/src/services](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/client/src/services)

Screens should mostly render layout. Hooks own screen workflows. Shared selectors return semantic state, while React-side copy helpers turn that state into labels and text.

### Shared game layer

Pure game and view-model helpers that should stay portable live in [shared/game](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/shared/game).

This currently includes:

- local game rules and collapse logic
- session normalization
- room context derivation
- game view selectors
- multiplayer event reaction helpers

### Server

The Node server is responsible for:

- serving the built React app
- serving the fallback shell when no client build exists
- Socket.IO room orchestration
- multiplayer game state management
- PostgreSQL-backed persistence and recovery

Important server areas:

- [server/index.js](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/server/index.js)
- [server/http/app.js](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/server/http/app.js)
- [server/socket/handlers.js](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/server/socket/handlers.js)
- [server/socket/services](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/server/socket/services)
- [server/game](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/server/game)
- [server/persistence](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/server/persistence)

Socket handlers should stay thin: parse payloads, call a service, acknowledge the result.

### Architecture guardrails

- Prefer plain functions and hooks over inheritance, registries, or factories.
- Add a new module only when it removes real duplication, isolates a risky concern, or makes logic meaningfully easier to test.
- Keep user-facing copy out of shared game selectors.
- Keep server socket policy in services, not event registration files.
- Keep PostgreSQL access behind the repository facade; do not add an ORM unless the schema becomes substantially more complex.

## Project structure

```text
client/
  src/
    components/
    game/
    hooks/
    providers/
    screens/
    services/
    view-models/
server/
  game/
  http/
  persistence/
  socket/
shared/
  game/
public/
  css/
  sounds/
tests/
```

## Development notes

Some naming conventions used in the codebase:

- `create*`: construct services, controllers, or helpers
- `select*`: derive view models from state
- `get*`: read existing values without mutating state
- `build*`: create DOM or structural output

In the client code:

- "player" usually means the current user
- "opponent" means the other player in a multiplayer room

## Install

```bash
npm install
```

## Run locally

For the full local development setup:

```bash
npm run dev
```

That starts the Node server. If you want the React development client as well:

```bash
npm run client:dev
```

## Build the client

```bash
npm run client:build
```

The server will serve `dist/client` when that build exists. If it does not, the fallback page in [public/index.html](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/public/index.html) is served instead.

## Database setup

Initialize PostgreSQL with:

```bash
npm run db:init
```

The schema lives in [server/persistence/schema.sql](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/server/persistence/schema.sql).

Run the room expiry job with:

```bash
npm run db:expire
```

Rooms are designed to expire after 7 days.

## Environment setup

Example environment files are included:

- `.env.test.example`
- `.env.staging.example`
- `.env.production.example`

### Staging

```bash
cp .env.staging.example .env.staging
npm run db:init:staging
npm run start:staging
```

### Production

```bash
cp .env.production.example .env.production
npm run db:init:production
npm run start:production
```

## Scripts

- `npm run dev`: start the Node server with nodemon
- `npm run client:dev`: start the Vite client dev server
- `npm run client:build`: build the React client into `dist/client`
- `npm run client:preview`: preview the built client with Vite
- `npm start`: start the server
- `npm run start:staging`: start the server with `.env.staging`
- `npm run start:production`: start the server with `.env.production`
- `npm run db:init`: initialize or update the configured PostgreSQL schema
- `npm run db:init:staging`: initialize staging schema
- `npm run db:init:production`: initialize production schema
- `npm run db:expire`: run the room expiry job
- `npm run db:expire:staging`: run the expiry job with `.env.staging`
- `npm run db:expire:production`: run the expiry job with `.env.production`
- `npm run check:project`: run lightweight project health checks
- `npm run verify`: run project health checks, unit tests, and the client build
- `npm run verify:full`: run `verify` plus Playwright end-to-end tests
- `npm test`: run the automated test suite
- `npm run test:watch`: run tests in watch mode
- `npm run test:e2e`: run Playwright end-to-end tests
- `npm run test:e2e:ui`: open the Playwright UI runner

## End-to-end tests

Playwright specs live in [tests/e2e](/Users/chris-alex/Documents/Projects/QTTT/Quantum-tic-tac-toe/tests/e2e).

The local-game E2E test always runs. Multiplayer E2E tests run when `/healthz` reports multiplayer as enabled, which requires PostgreSQL to be reachable. When PostgreSQL is offline, those scenarios are skipped with a clear message instead of failing for environment reasons.

## Deployment notes

- PostgreSQL is the persistence layer.
- The app is designed to run happily on a small deployment target.
- If PostgreSQL is unavailable, the server can still boot, but database-backed multiplayer features are reduced or disabled in the UI.
- The dev admin screen is available at `/admin/dev-db` outside production.
