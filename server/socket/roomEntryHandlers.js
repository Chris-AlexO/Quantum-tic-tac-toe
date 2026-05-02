import { SOCKET_EVENTS } from "../../shared/game/events.js";
export function registerRoomEntryHandlers(context) {
  const {
    sock,
    player,
    roomManager,
    serializeRoomState,
    clientReady,
    createRoom,
    enterRoom,
    joinReadyRoom
  } = context;

  sock.on(SOCKET_EVENTS.GET_STATE, async (payload, ack) => {
    const { roomId } = payload || {};
    const room = roomManager.getRoom(roomId);

    if (!room) {
      return ack?.({ status: "nogame", message: "Room not found" });
    }

    const mark = room.getPlayerMark(player);
    return ack?.({
      status: "ok",
      state: serializeRoomState(room),
      mark,
      role: mark ? "player" : "spectator"
    });
  });

  sock.on(SOCKET_EVENTS.CREATE_ROOM, async (data, ack) => {
    return ack?.(await createRoom(data));
  });

  sock.on(SOCKET_EVENTS.JOIN_SPECIFIC_ROOM, async (payload, ack) => {
    const { roomId } = payload || {};
    const result = await enterRoom(roomId);
    if (result.status !== "ok") {
      return ack?.(result.status === "occupied"
        ? result
        : { status: "error", message: "No room with that id" });
    }

    return ack?.(result);
  });

  sock.on(SOCKET_EVENTS.ENTER_ROOM, async (payload, ack) => {
    const { roomId } = payload || {};
    const result = await enterRoom(roomId);

    if (result.status !== "ok") {
      return ack?.(result);
    }

    return ack?.(result);
  });

  sock.on(SOCKET_EVENTS.JOIN_READY_ROOM, async (data, ack) => {
    return ack?.(await joinReadyRoom(data));
  });

  sock.on(SOCKET_EVENTS.CLIENT_READY, async (data, ack) => {
    return ack?.(await clientReady(data?.roomId));
  });
}
