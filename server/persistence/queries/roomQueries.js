import { serializeRoomState } from "../../game/serializers.js";
import { nowIso, sevenDaysFromNowIso } from "./time.js";

export async function syncRoom(repository, room) {
  await repository.ensureReady();

  const snapshot = serializeRoomState(room);
  const now = nowIso();
  const expiresAt = sevenDaysFromNowIso();

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
      expiresAt
    ]
  );
}

export async function syncParticipants(repository, room) {
  await repository.ensureReady();

  const now = nowIso();
  const participants = [];

  for (const [mark, player] of Object.entries(room.players)) {
    if (!player?.playerId) continue;
    participants.push({ roomId: room.roomId, playerId: player.playerId, role: "player", mark });
  }

  for (const spectator of room.spectators ?? []) {
    if (!spectator?.playerId) continue;
    participants.push({ roomId: room.roomId, playerId: spectator.playerId, role: "spectator", mark: null });
  }

  for (const participant of participants) {
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
      [participant.roomId, participant.playerId, participant.role, participant.mark, now, now]
    );
  }
}

export async function getRoomSnapshot(repository, roomId) {
  await repository.ensureReady();

  const result = await repository.pool.query(
    `
      SELECT snapshot_json
      FROM rooms
      WHERE id = $1
    `,
    [roomId]
  );

  return result.rows[0]?.snapshot_json ?? null;
}

export async function listActiveRooms(repository) {
  await repository.ensureReady();

  const result = await repository.pool.query(
    `
      SELECT id, room_type, ruleset, status, updated_at, expires_at, snapshot_json
      FROM rooms
      ORDER BY updated_at DESC
    `
  );

  return result.rows;
}

export async function listRooms(repository, { limit = 25 } = {}) {
  await repository.ensureReady();

  const result = await repository.pool.query(
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
        updated_at,
        expires_at
      FROM rooms
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function deleteRoomsByIds(repository, roomIds = []) {
  await repository.ensureReady();
  if (!roomIds.length) {
    return { deletedRoomCount: 0, deletedRoomIds: [] };
  }

  await repository.pool.query(
    `
      DELETE FROM room_participants
      WHERE room_id = ANY($1::text[])
    `,
    [roomIds]
  );

  await repository.pool.query(
    `
      UPDATE players
      SET
        active_room_id = NULL,
        active_role = NULL,
        active_mark = NULL,
        updated_at = $2::timestamptz
      WHERE active_room_id = ANY($1::text[])
    `,
    [roomIds, nowIso()]
  );

  await repository.pool.query(
    `
      DELETE FROM rooms
      WHERE id = ANY($1::text[])
    `,
    [roomIds]
  );

  return {
    deletedRoomCount: roomIds.length,
    deletedRoomIds: roomIds
  };
}
