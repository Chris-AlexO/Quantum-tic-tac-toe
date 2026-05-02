import { nowIso } from "./time.js";

export async function syncPlayerPresence(repository, player, { roomId = null, role = null, mark = null } = {}) {
  await repository.ensureReady();

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
    [
      player.playerId,
      player.playerName ?? "Waiting...",
      player.connectionStatus ?? "online",
      roomId,
      role,
      mark,
      nowIso()
    ]
  );
}

export async function clearPlayerPresence(repository, playerId) {
  await repository.ensureReady();

  await repository.pool.query(
    `
      UPDATE players
      SET active_room_id = NULL, active_role = NULL, active_mark = NULL, updated_at = $1::timestamptz
      WHERE id = $2
    `,
    [nowIso(), playerId]
  );
}

export async function getPlayerPresence(repository, playerId) {
  await repository.ensureReady();

  const result = await repository.pool.query(
    `
      SELECT
        p.id,
        p.display_name,
        p.connection_status,
        p.active_room_id,
        p.active_role,
        p.active_mark,
        p.updated_at,
        r.status AS room_status,
        r.room_type,
        r.snapshot_json
      FROM players p
      LEFT JOIN rooms r
        ON r.id = p.active_room_id
      WHERE p.id = $1
    `,
    [playerId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    displayName: row.display_name,
    connectionStatus: row.connection_status,
    activeRoomId: row.active_room_id,
    activeRole: row.active_role,
    activeMark: row.active_mark,
    updatedAt: row.updated_at,
    roomStatus: row.room_status,
    roomType: row.room_type,
    snapshot: row.snapshot_json ?? null
  };
}

export async function listPlayers(repository, { limit = 50 } = {}) {
  await repository.ensureReady();

  const result = await repository.pool.query(
    `
      SELECT
        id,
        display_name,
        connection_status,
        active_room_id,
        active_role,
        active_mark,
        updated_at
      FROM players
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function clearOrphanedReferences(repository) {
  await repository.ensureReady();

  await repository.pool.query(
    `
      DELETE FROM room_participants rp
      WHERE NOT EXISTS (
        SELECT 1
        FROM rooms r
        WHERE r.id = rp.room_id
      )
    `
  );

  await repository.pool.query(
    `
      UPDATE players p
      SET
        active_room_id = NULL,
        active_role = NULL,
        active_mark = NULL,
        updated_at = $1::timestamptz
      WHERE p.active_room_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM rooms r
          WHERE r.id = p.active_room_id
        )
    `,
    [nowIso()]
  );
}
