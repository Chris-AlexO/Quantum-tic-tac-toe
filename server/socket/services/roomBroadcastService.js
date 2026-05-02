import { SOCKET_EVENTS } from "../../../shared/game/events.js";
import { serializeRoomState } from "../../game/serializers.js";

export function createRoomBroadcastService({ io, repository, runRepositoryTask, logger }) {
  const persistRoom = room => runRepositoryTask?.(() => repository?.syncRoom?.(room));
  const persistPresence = (targetPlayer, context) =>
    runRepositoryTask?.(() => repository?.syncPlayerPresence?.(targetPlayer, context));
  const clearPresence = playerId =>
    runRepositoryTask?.(() => repository?.clearPlayerPresence?.(playerId));

  const getRoomChannelId = room => room.getId?.() ?? room.roomId;

  function emitRoomState(room) {
    io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.ROOM_STATE_UPDATED, {
      state: serializeRoomState(room)
    });
    void persistRoom(room);
  }

  async function startRoomCountdown(room) {
    const socketIdX = room.getPlayerSocketID("X");
    const socketIdO = room.getPlayerSocketID("O");

    room.beginCountdown(async () => {
      room.startGame(() => {
        emitRoomState(room);
      });
      void persistRoom(room);

      const payloadX = { state: serializeRoomState(room), mark: "X" };
      const payloadO = { state: serializeRoomState(room), mark: "O" };

      const [acksX, acksO] = await Promise.all([
        io.to(socketIdX).timeout(3000).emitWithAck(SOCKET_EVENTS.ROOM_READY, payloadX),
        io.to(socketIdO).timeout(3000).emitWithAck(SOCKET_EVENTS.ROOM_READY, payloadO)
      ]);

      logger.debug("Room ready acknowledgements received", {
        roomId: room.roomId,
        ackX: acksX[0],
        ackO: acksO[0]
      });
    });

    io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.ROOM_STARTING, {
      state: serializeRoomState(room)
    });
    void persistRoom(room);
  }

  return {
    clearPresence,
    emitRoomState,
    getRoomChannelId,
    persistPresence,
    persistRoom,
    serializeRoomState,
    startRoomCountdown
  };
}
