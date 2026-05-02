import {
  getPreferredRuleset,
  getSavedPlayerName
} from "../lib/playerProfile.js";
import { createLogger } from "../lib/logger.js";
import { emitWithAck } from "./emitWithAck.js";
import { getGameSocket } from "./gameSocket.js";
import { SOCKET_EVENTS } from "../../../shared/game/events.js";

const logger = createLogger("gameSocketClient");

export function createGameSocketClient({ sessionStore } = {}) {
  const getRoomId = () => sessionStore?.getSnapshot().session.roomId ?? null;
  const emit = (event, payload = {}) => emitWithAck(event, payload, { roomId: getRoomId() });

  return {
    createRoom(roomName) {
      if (!roomName) {
        return null;
      }

      return emit(SOCKET_EVENTS.CREATE_ROOM, {
        roomName,
        type: "mp",
        ruleset: getPreferredRuleset(),
        name: getSavedPlayerName()
      });
    },

    enterRoom(roomId) {
      return emitWithAck(SOCKET_EVENTS.ENTER_ROOM, { roomId });
    },

    getState(roomId) {
      return emitWithAck(SOCKET_EVENTS.GET_STATE, { roomId });
    },

    clientReady(roomId) {
      return emitWithAck(SOCKET_EVENTS.CLIENT_READY, { roomId });
    },

    async quickMatch(ruleset = getPreferredRuleset()) {
      try {
        return await emit(SOCKET_EVENTS.JOIN_READY_ROOM, {
          requestedRoomType: "mp",
          ruleset
        });
      } catch (error) {
        logger.error("Quick match failed", { message: error?.message ?? "Unknown error" });
        return null;
      }
    },

    sendMove(bigSquare) {
      return emit(SOCKET_EVENTS.MOVE, { bigSquare });
    },

    sendCollapse(chosenBigSquare, chosenMark) {
      return emit(SOCKET_EVENTS.COLLAPSE, {
        square: chosenBigSquare,
        playerSymbol: chosenMark
      });
    },

    async sendPlayerName(name) {
      try {
        return await emit(SOCKET_EVENTS.NAME, { name });
      } catch (error) {
        logger.warn("Unable to save player name", { message: error?.message ?? "Unknown error" });
        return null;
      }
    },

    async joinRoomById(roomId) {
      try {
        const ack = await emit(SOCKET_EVENTS.JOIN_SPECIFIC_ROOM, { roomId });
        return ack?.roomId ? ack : null;
      } catch (error) {
        logger.warn("Join by room id failed", { message: error?.message ?? "Unknown error" });
        return null;
      }
    },

    async requestRematch() {
      return emitRoomRequest(SOCKET_EVENTS.REMATCH_REQUEST, "Rematch request failed");
    },

    async respondToRematch(accept) {
      return emitRoomRequest(SOCKET_EVENTS.REMATCH_RESPOND, "Rematch response failed", {
        accept: Boolean(accept)
      });
    },

    async requestDraw() {
      return emitRoomRequest(SOCKET_EVENTS.DRAW_REQUEST, "Draw request failed");
    },

    async respondToDraw(accept) {
      return emitRoomRequest(SOCKET_EVENTS.DRAW_RESPOND, "Draw response failed", {
        accept: Boolean(accept)
      });
    },

    async leaveGame({ roomId = getRoomId(), forfeit = false } = {}) {
      try {
        return await emit(SOCKET_EVENTS.LEAVE_GAME, {
          roomId,
          forfeit: Boolean(forfeit)
        });
      } catch (error) {
        logger.warn("Leave game failed", { message: error?.message ?? "Unknown error" });
        return null;
      }
    },

    subscribeToRoomState(listener) {
      const activeSocket = getGameSocket();
      const handleRoomEvent = payload => {
        listener?.(payload?.state ?? null, payload);
      };

      activeSocket.on(SOCKET_EVENTS.ROOM_STATE_UPDATED, handleRoomEvent);
      activeSocket.on(SOCKET_EVENTS.ROOM_STARTING, handleRoomEvent);
      activeSocket.on(SOCKET_EVENTS.ROOM_READY, handleRoomEvent);

      return () => {
        activeSocket.off(SOCKET_EVENTS.ROOM_STATE_UPDATED, handleRoomEvent);
        activeSocket.off(SOCKET_EVENTS.ROOM_STARTING, handleRoomEvent);
        activeSocket.off(SOCKET_EVENTS.ROOM_READY, handleRoomEvent);
      };
    }
  };

  async function emitRoomRequest(event, logMessage, payload = {}) {
    const roomId = getRoomId();
    if (!roomId) {
      return null;
    }

    try {
      return await emit(event, { roomId, ...payload });
    } catch (error) {
      logger.warn(logMessage, { message: error?.message ?? "Unknown error" });
      return null;
    }
  }
}
