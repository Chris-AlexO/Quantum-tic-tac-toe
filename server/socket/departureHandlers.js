import { SOCKET_EVENTS } from "../../shared/game/events.js";
import C from "../game/constants.js";

export function registerDepartureHandlers(context) {
  const {
    io,
    sock,
    player,
    roomManager,
    resolvePlayerRoom,
    finalizePlayerDeparture,
    clearPresence,
    persistPresence,
    persistRoom,
    emitRoomState,
    logger
  } = context;

  sock.on(SOCKET_EVENTS.LEAVE_GAME, async (payload, ack) => {
    const room = await resolvePlayerRoom();
    if (!room) {
      await clearPresence?.(player.playerId);
      player.leaveRoom();
      return ack?.({ status: "ok", roomClosed: true });
    }

    const mark = room.getPlayerMark(player);
    const shouldForfeit = Boolean(payload?.forfeit);
    const hasOpponent = Boolean(mark && room.getPlayer(room.getOpponentMark(mark)));
    const isActiveMatch = mark && ["waiting", "starting", "playing"].includes(room.getStatus()) && hasOpponent;

    if (isActiveMatch && !shouldForfeit) {
      return ack?.({
        status: "confirm_forfeit",
        message: "Leaving now will forfeit the match."
      });
    }

    const result = await finalizePlayerDeparture({
      room,
      mark,
      reason: shouldForfeit ? "leave" : "leave",
      forfeit: Boolean(isActiveMatch && shouldForfeit)
    });

    return ack?.({
      status: result.status,
      roomClosed: Boolean(result.deletedRoom),
      winnerMark: result.winnerMark ?? null
    });
  });

  sock.on(SOCKET_EVENTS.DISCONNECT, async () => {
    logger.info("Socket disconnected", {
      socketId: sock.id,
      playerId: sock.playerId
    });

    const room = await resolvePlayerRoom();
    if (!room) return;

    roomManager.removeFromQueue(player);

    const mark = room.getPlayerMark(player);
    const roomId = room.getId?.() ?? room.roomId;
    const hasOpponent = Boolean(mark && room.getPlayer(room.getOpponentMark(mark)));

    if (!mark) {
      await finalizePlayerDeparture({ room, mark: null, forfeit: false });
      return;
    }

    if (!hasOpponent || room.getStatus() === C.ROOM_STATUS.FINISHED) {
      await finalizePlayerDeparture({ room, mark, forfeit: false });
      return;
    }

    room.setDisconnectState(mark, Date.now() + C.TIME.DISCONNECT_GRACE_MS);
    player.setOffline();
    void persistPresence(player, { roomId, role: "player", mark });
    emitRoomState(room);
    io.to(roomId).emit(SOCKET_EVENTS.PLAYER_OFFLINE, {
      mark,
      expiresAt: room.getDisconnectState()?.expiresAt ?? null
    });
    logger.info("Starting disconnect grace flow", {
      playerId: player.playerId,
      roomId,
      mark
    });

    const playerLeftCallback = async () => {
      await finalizePlayerDeparture({
        room,
        mark,
        reason: "disconnect",
        forfeit: true
      });
    };

    const playerTimeoutWarningCallback = () => {
      const expiresAt = room.getDisconnectState()?.expiresAt ?? null;
      const secondsRemaining = expiresAt
        ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
        : 0;

      io.to(roomId).emit(SOCKET_EVENTS.PLAYER_TIMEOUT_WARNING, { mark, expiresAt, secondsRemaining });
    };

    room.startTimeout(player, playerLeftCallback);
    room.startTimeoutInterval(player, playerTimeoutWarningCallback);
    void persistRoom(room);
  });
}
