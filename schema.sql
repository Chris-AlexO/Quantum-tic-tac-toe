CREATE SCHEMA IF NOT EXISTS dev;


CREATE TABLE IF NOT EXISTS dev.rooms (
  id TEXT PRIMARY KEY,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL,
  host_player_id TEXT,
  current_turn TEXT,
  next_action TEXT,
  winner TEXT,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS dev.players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  connection_status TEXT NOT NULL,
  current_room_id TEXT,
  player_role TEXT,
  current_mark TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS dev.room_participants (
  room_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  role TEXT NOT NULL,
  mark TEXT,
  joined_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_players_current_room_id
  ON dev.players(current_room_id);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id
  ON dev.room_participants(room_id);

CREATE INDEX IF NOT EXISTS idx_rooms_status_updated_at
  ON dev.rooms(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rooms_snapshot_json
  ON dev.rooms USING GIN(snapshot_json);
