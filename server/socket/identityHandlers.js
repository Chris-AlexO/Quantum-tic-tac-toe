import { SOCKET_EVENTS } from "../../shared/game/events.js";

export function registerIdentityHandlers(context) {
  const {
    sock,
    player,
    persistPresence,
    resolvePlayerRoom,
    getLivePlayerRoomState,
    serializeRoomState,
    emitRoomState,
    logger
  } = context;

  sock.on(SOCKET_EVENTS.NAME, async (payload, ack) => {
    const name = payload?.name ?? "";
    player.setName(name);
    const room = await resolvePlayerRoom();
    const mark = room?.getPlayerMark(player) ?? null;
    void persistPresence(player, {
      roomId: room?.roomId ?? null,
      role: room ? (mark ? "player" : "spectator") : null,
      mark
    });
    return ack?.({ status: "ok" });
  });

  sock.on(SOCKET_EVENTS.RESUME_OR_HELLO, async (payload, ack) => {
    const requestedRoomId = payload?.roomId ?? null;
    const activeState = await getLivePlayerRoomState();
    const room = activeState?.room ?? null;

    if (!room) {
      return ack?.({ status: "hello", roomId: null });
    }

    if (requestedRoomId && requestedRoomId !== room.roomId) {
      return ack?.({ status: "hello", roomId: null });
    }

    const mark = room.rejoinRoom(player);
    if (!mark) {
      return ack?.({ status: "hello", roomId: null });
    }

    logger.debug("Clearing disconnect timers after session resume", {
      playerId: player.playerId
    });
    room.endTimeout(player);
    sock.join(room.getId());
    player.setOnline();
    void persistPresence(player, {
      roomId: room.roomId,
      role: "player",
      mark
    });
    emitRoomState(room);

    return ack?.({
      status: "ok",
      roomId: room.getId?.(),
      state: serializeRoomState(room),
      mark: room.getPlayerMark(player)
    });
  });
}
