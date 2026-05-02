export function createPlayerRoomIndex() {
  const playerIndex = new Map();
  const hostIndex = new Map();

  function getPlayerId(playerOrId) {
    if (!playerOrId) return null;
    if (typeof playerOrId === "string") return playerOrId;
    if (typeof playerOrId.getPlayerID === "function") {
      return playerOrId.getPlayerID();
    }
    return playerOrId.playerId ?? null;
  }

  function addPlayer(player, room, mark, extra = {}) {
    if (!player?.playerId || !room?.roomId || !mark) return false;

    const record = playerIndex.get(player.playerId) || {};
    playerIndex.set(player.playerId, {
      ...record,
      ...extra,
      roomId: room.roomId,
      socketId: player.socketId,
      player,
      mark
    });

    if (mark === "X") {
      hostIndex.set(player.playerId, room.roomId);
    }

    return true;
  }

  function clearPlayer(playerId, roomId = null) {
    if (!playerId) return false;

    playerIndex.delete(playerId);
    if (!roomId || hostIndex.get(playerId) === roomId) {
      hostIndex.delete(playerId);
    }

    return true;
  }

  function clearRoom(roomId) {
    if (!roomId) return false;

    for (const [playerId, record] of playerIndex.entries()) {
      if (record?.roomId === roomId) {
        playerIndex.delete(playerId);
      }
    }

    for (const [playerId, indexedRoomId] of hostIndex.entries()) {
      if (indexedRoomId === roomId) {
        hostIndex.delete(playerId);
      }
    }

    return true;
  }

  function hasRoomReference(roomId) {
    for (const record of playerIndex.values()) {
      if (record?.roomId === roomId) {
        return true;
      }
    }

    return false;
  }

  return {
    playerIndex,
    hostIndex,
    addPlayer,
    clearPlayer,
    clearRoom,
    getPlayerId,
    hasRoomReference
  };
}
