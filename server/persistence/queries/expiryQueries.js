export async function deleteExpiredRooms(repository, { limit = 500 } = {}) {
  await repository.ensureReady();

  const result = await repository.pool.query(
    `
      SELECT id
      FROM rooms
      WHERE expires_at <= NOW()
      ORDER BY expires_at ASC
      LIMIT $1
    `,
    [limit]
  );

  const expiredRoomIds = result.rows.map(row => row.id);
  const deletionResult = await repository.deleteRoomsByIds(expiredRoomIds);
  await repository.clearOrphanedReferences();

  return deletionResult;
}

export async function clearAllData(repository) {
  await repository.ensureReady();

  await repository.pool.query("DELETE FROM room_participants");
  await repository.pool.query("DELETE FROM rooms");
  await repository.pool.query("DELETE FROM players");

  return { status: "ok" };
}
