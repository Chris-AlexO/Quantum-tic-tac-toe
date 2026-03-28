

Player refers to current client's user. Opponent refers to other client's user.

Build functions create dom elements. Select functions are select.


# Quantum Tic-Tac-Toe

Quantum Tic-Tac-Toe with local play, live multiplayer rooms, spectators, rematch/draw handling, PostgreSQL-backed room tracking, and a development admin view for database inspection.

## Rulesets

This app supports two rulesets:

### 1. House rules

This is the default mode

- When a cycle collapses, the resolving player can pick from the cycle symbols shown in the UI.
- Collapse resolution is flexible and intentionally leans into the "QM-inspired" interpretation already used in the project.
- Collapsed marks are stored as plain `X` / `O`.
- If both players complete a line at the same time, the app resolves that as a draw.

### 2. Allan Goff rules

This mode is meant to follow the original Quantum Tic-Tac-Toe rules more closely.

- A cycle collapse is treated as a two-outcome measurement.
- The resolving player chooses between the two placements of the cycle-closing move, rather than picking from the broader flexible collapse menu used by the house rules.
- Collapsed marks keep their move identity (for example `X1`, `O6`) so the game can use Allan Goff's simultaneous-line tie-break logic.
- If both players complete a line on the same collapse, the winner is the player whose winning line has the lower highest move number. If that tie-break is still equal, the app falls back to a draw.

## References

The Allan Goff ruleset in this app is based on the published / documented Quantum Tic-Tac-Toe rule descriptions:

- [Wikipedia: Quantum tic-tac-toe](https://en.wikipedia.org/wiki/Quantum_tic-tac-toe)
- [The Codentropy site archive / overview of Allan Goff's Quantum Tic-Tac-Toe](https://cqt.uwa.edu.au/)

## Development

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Initialize PostgreSQL schema

```bash
npm run db:init
```

The init script opens the configured PostgreSQL connection and applies the schema file in `server/persistence/schema.sql`.

## Environment setup

Example environment files are included for common environments:

- `.env.test.example`
- `.env.staging.example`
- `.env.production.example`

### Staging

Suggested workflow:

```bash
cp .env.staging.example .env.staging
npm run db:init:staging
npm run start:staging
```

### Production

Suggested workflow:

```bash
cp .env.production.example .env.production
npm run db:init:production
npm run start:production
```

## Important runtime scripts

- `npm run dev` - local development with nodemon
- `npm start` - generic runtime start
- `npm run start:staging` - staging runtime profile
- `npm run start:production` - production runtime profile
- `npm run db:init` - initialize / update schema against the configured database
- `npm run db:init:staging` - initialize staging schema
- `npm run db:init:production` - initialize production schema
- `npm test` - run the automated test suite

## Deployment notes

- PostgreSQL is the intended database for staging and production.
- The server can still boot if PostgreSQL is unavailable, but multiplayer and active DB-backed tooling will be disabled in the UI.
- The development admin page at `/admin/dev-db` is read-only and intended for troubleshooting room/player persistence while preparing deployment.
