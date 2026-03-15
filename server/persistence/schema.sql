CREATE TABLE IF NOT EXISTS rooms (
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

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  connection_status TEXT NOT NULL,
  active_room_id TEXT,
  active_role TEXT,
  active_mark TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS room_participants (
  room_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  role TEXT NOT NULL,
  mark TEXT,
  joined_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_players_current_room_id
  ON players(active_room_id);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id
  ON room_participants(room_id);

CREATE INDEX IF NOT EXISTS idx_rooms_status_updated_at
  ON rooms(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rooms_snapshot_json
  ON rooms USING GIN(snapshot_json);
