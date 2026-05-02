export function createRoomPersistenceSession({
  getPlayerId,
  rooms,
  playerIndex,
  getRepositoryContext
}) {
  async function getPersistedPlayerPresence(playerOrId) {
    const playerId = getPlayerId(playerOrId);
    const { repository, runRepositoryTask } = getRepositoryContext();

    if (!playerId || !repository?.getPlayerPresence || !runRepositoryTask) {
      return null;
    }

    return runRepositoryTask(() => repository.getPlayerPresence(playerId));
  }

  async function hydratePlayerFromPersistence(player) {
    if (!player) return null;

    const persisted = await getPersistedPlayerPresence(player);
    if (!persisted) {
      return null;
    }

    if (persisted.displayName && !player.getName()) {
      player.setName(persisted.displayName);
    }

    const room = persisted.activeRoomId ? rooms.get(persisted.activeRoomId) : null;
    if (room) {
      const mark = persisted.activeMark ?? room.getPlayerMark(player) ?? null;
      indexPersistedPlayer({
        playerId: player.playerId,
        persisted,
        room,
        mark,
        player
      });

      player.setRoom(persisted.activeRoomId);
      if (mark) {
        player.setMark(mark);
      }
    }

    return persisted;
  }

  async function resolvePlayerSession(playerOrId) {
    const playerId = getPlayerId(playerOrId);
    if (!playerId) {
      return null;
    }

    const cachedRecord = playerIndex.get(playerId);
    const cachedRoom = cachedRecord?.roomId ? rooms.get(cachedRecord.roomId) : null;
    if (cachedRoom) {
      return buildSession({
        source: "cache",
        room: cachedRoom,
        playerOrId,
        record: cachedRecord
      });
    }

    const persisted = await getPersistedPlayerPresence(playerId);
    if (!persisted) {
      return null;
    }

    const persistedRoom = persisted.activeRoomId ? rooms.get(persisted.activeRoomId) : null;
    if (!persistedRoom) {
      return buildPersistedSession({ persisted, room: null });
    }

    const mark = persisted.activeMark ?? cachedRecord?.mark ?? persistedRoom.getPlayerMark(playerOrId) ?? null;
    indexPersistedPlayer({
      playerId,
      persisted,
      room: persistedRoom,
      mark,
      record: cachedRecord
    });

    return buildPersistedSession({
      persisted,
      room: persistedRoom,
      playerOrId,
      mark
    });
  }

  async function resolvePlayerRoom(playerOrId) {
    const session = await resolvePlayerSession(playerOrId);
    return session?.room ?? null;
  }

  function indexPersistedPlayer({
    playerId,
    persisted,
    room,
    mark,
    player = null,
    record = playerIndex.get(playerId) || {}
  }) {
    playerIndex.set(playerId, {
      ...record,
      roomId: persisted.activeRoomId,
      socketId: player?.socketId ?? record.socketId,
      player: player ?? record.player,
      mark,
      role: persisted.activeRole ?? record.role ?? null
    });
  }

  return {
    getPersistedPlayerPresence,
    hydratePlayerFromPersistence,
    resolvePlayerRoom,
    resolvePlayerSession
  };
}

function buildSession({ source, room, playerOrId, record }) {
  return {
    source,
    room,
    roomId: room.roomId,
    mark: record?.mark ?? room.getPlayerMark(playerOrId) ?? null,
    role: record?.mark ? "player" : record?.role ?? null,
    snapshot: null
  };
}

function buildPersistedSession({ persisted, room, playerOrId = null, mark = null }) {
  return {
    source: "db",
    room,
    roomId: room?.roomId ?? persisted.activeRoomId ?? null,
    mark: mark ?? persisted.activeMark ?? null,
    role: persisted.activeRole ?? null,
    snapshot: persisted.snapshot ?? null,
    displayName: persisted.displayName ?? null
  };
}
