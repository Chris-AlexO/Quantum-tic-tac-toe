import { SOCKET_EVENTS } from "../../shared/game/events.js";

export function registerMatchRequestHandlers(context) {
  const {
    io,
    sock,
    player,
    resolvePlayerRoom,
    getRoomChannelId,
    serializeRoomState,
    persistRoom,
    startRoomCountdown
  } = context;

  sock.on(SOCKET_EVENTS.REMATCH_REQUEST, async (_payload, ack) => {
    const room = await resolvePlayerRoom();
    if (!room) {
      return ack?.({ status: "error", message: "room not found" });
    }

    const mark = room.getPlayerMark(player);
    const result = room.requestRematch(mark);
    if (result.status !== "ok") {
      return ack?.(result);
    }

    io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.REMATCH_REQUESTED, {
      requesterMark: result.requesterMark,
      phase: result.phase,
      state: serializeRoomState(room)
    });
    void persistRoom(room);

    return ack?.({ status: "ok" });
  });

  sock.on(SOCKET_EVENTS.DRAW_REQUEST, async (_payload, ack) => {
    const room = await resolvePlayerRoom();
    if (!room) {
      return ack?.({ status: "error", message: "room not found" });
    }

    const mark = room.getPlayerMark(player);
    const result = room.requestDraw(mark);
    if (result.status !== "ok") {
      return ack?.(result);
    }

    io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.DRAW_REQUESTED, {
      requesterMark: result.requesterMark,
      phase: result.phase,
      state: serializeRoomState(room)
    });
    void persistRoom(room);

    return ack?.({ status: "ok" });
  });

  sock.on(SOCKET_EVENTS.DRAW_RESPOND, async (payload, ack) => {
    const room = await resolvePlayerRoom();
    if (!room) {
      return ack?.({ status: "error", message: "room not found" });
    }

    const mark = room.getPlayerMark(player);
    const result = room.respondToDraw(mark, payload?.accept);
    if (result.status !== "ok") {
      return ack?.(result);
    }

    io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.DRAW_STATUS, {
      status: result.accepted ? "accepted" : "declined",
      requesterMark: result.requesterMark,
      responderMark: result.responderMark,
      phase: result.phase,
      state: serializeRoomState(room)
    });
    void persistRoom(room);

    return ack?.({ status: "ok" });
  });

  sock.on(SOCKET_EVENTS.REMATCH_RESPOND, async (payload, ack) => {
    const room = await resolvePlayerRoom();
    if (!room) {
      return ack?.({ status: "error", message: "room not found" });
    }

    const mark = room.getPlayerMark(player);
    const result = room.respondToRematch(mark, payload?.accept);
    if (result.status !== "ok") {
      return ack?.(result);
    }

    if (!result.accepted) {
      io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.REMATCH_STATUS, {
        status: "declined",
        requesterMark: result.requesterMark,
        responderMark: result.responderMark,
        phase: result.phase,
        state: serializeRoomState(room)
      });
      void persistRoom(room);

      return ack?.({ status: "ok" });
    }

    room.rematchGame();
    room.readyPlayer("X");
    room.readyPlayer("O");
    await startRoomCountdown(room);

    io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.REMATCH_STATUS, {
      status: "accepted",
      requesterMark: result.requesterMark,
      responderMark: result.responderMark,
      phase: result.phase,
      state: serializeRoomState(room)
    });
    void persistRoom(room);

    return ack?.({ status: "ok" });
  });
}
