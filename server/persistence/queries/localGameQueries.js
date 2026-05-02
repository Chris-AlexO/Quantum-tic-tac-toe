import { nowIso, sevenDaysFromNowIso } from "./time.js";

export async function saveLocalGameSnapshot(repository, playerId, {
  playerName = "Player X",
  snapshot = null
} = {}) {
  await repository.ensureReady();

  if (!playerId || !snapshot?.state) {
    throw new Error("A player id and local game snapshot are required.");
  }

  const roomId = `local:${playerId}`;
  const now = nowIso();
  const expiresAt = sevenDaysFromNowIso();
  const session = snapshot.state.session ?? {};
  const game = snapshot.state.game ?? {};

  await repository.pool.query(
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
      expiresAt
    ]
  );

  await repository.pool.query(
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
    [playerId, playerName, "online", roomId, "player", "X", now]
  );

  await repository.pool.query(
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
    expiresAt
  };
}

export async function getLocalGameSnapshot(repository, playerId) {
  await repository.ensureReady();

  if (!playerId) {
    return null;
  }

  const roomId = `local:${playerId}`;
  const result = await repository.pool.query(
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

export async function clearLocalGameSnapshot(repository, playerId) {
  await repository.ensureReady();

  if (!playerId) {
    return { status: "ok" };
  }

  const roomId = `local:${playerId}`;
  const now = nowIso();

  await repository.pool.query(
    `
      DELETE FROM room_participants
      WHERE room_id = $1
    `,
    [roomId]
  );

  await repository.pool.query(
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

  await repository.pool.query(
    `
      DELETE FROM rooms
      WHERE id = $1
        AND room_type = 'local'
    `,
    [roomId]
  );

  return {
    status: "ok",
    roomId
  };
}
