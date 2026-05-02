import { SOCKET_EVENTS } from "../../../shared/game/events.js";

export function createDepartureService({
  io,
  sock,
  player,
  roomManager,
  broadcast
}) {
  function cleanupRoomIfAbandoned(room) {
    if (roomManager.shouldDeleteRoom(room)) {
      roomManager.deleteRoom(room);
      return true;
    }

    return false;
  }

  async function finalizePlayerDeparture({ room, mark, reason = "leave", forfeit = false }) {
    if (!room) {
      await broadcast.clearPresence?.(player.playerId);
      player.leaveRoom();
      return { status: "ok", deletedRoom: false };
    }

    const roomId = broadcast.getRoomChannelId(room);

    if (forfeit) {
      const forfeitResult = room.forfeitPlayer(mark, reason);
      if (forfeitResult.status !== "ok") {
        return forfeitResult;
      }

      player.setOffline();
      player.leaveRoom();
      roomManager.clearRoomReferences(room, { playerId: player.playerId, dropSeat: false });
      await broadcast.clearPresence?.(player.playerId);
      sock.leave(roomId);

      broadcast.emitRoomState(room);
      io.to(roomId).emit(SOCKET_EVENTS.PLAYER_LEFT, {
        mark,
        reason,
        winnerMark: forfeitResult.winnerMark
      });

      return { status: "ok", deletedRoom: false, winnerMark: forfeitResult.winnerMark };
    }

    player.leaveRoom();
    player.setOffline();
    roomManager.clearRoomReferences(room, {
      playerId: player.playerId,
      dropSeat: true
    });
    await broadcast.clearPresence?.(player.playerId);
    sock.leave(roomId);

    const deletedRoom = cleanupRoomIfAbandoned(room);
    if (!deletedRoom) {
      broadcast.emitRoomState(room);
    }

    return { status: "ok", deletedRoom };
  }

  return {
    finalizePlayerDeparture
  };
}
