import { emitWithAck } from "../services/emitWithAck.js";
import { getGameSocket } from "../services/gameSocket.js";
import { createMultiplayerEventHandlers } from "../../../shared/game/multiplayerEventHandlers.js";
import { SOCKET_EVENTS } from "../../../shared/game/events.js";
import { createLogger } from "../lib/logger.js";
import { formatMultiplayerToast } from "./multiplayerToastCopy.js";

export function createGameEventBridge({ sessionStore } = {}) {
  const socket = getGameSocket();
  const logger = createLogger("createGameEventBridge");
  const handlers = createMultiplayerEventHandlers({
    resumeSession: () =>
      emitWithAck(SOCKET_EVENTS.RESUME_OR_HELLO, {}, {
        roomId: sessionStore.getSnapshot().session.roomId
      }),
    getSnapshot: sessionStore.getSnapshot,
    applyServerState: sessionStore.applyServerState,
    setToastState: toast => {
      const message = formatMultiplayerToast(toast);
      if (message) {
        sessionStore.setToastMessage(message);
      }
    },
    logWarn: (message, context) => logger.warn(message, context),
    updateDisconnectState: disconnectState => {
      sessionStore.patch(snapshot => ({
        ...snapshot,
        session: {
          ...snapshot.session,
          disconnectState: disconnectState
            ? {
                ...snapshot.session.disconnectState,
                ...disconnectState
              }
            : null
        }
      }));
    },
    setRematchPrompt: rematchPrompt => {
      sessionStore.patch(snapshot => ({
        ...snapshot,
        ui: {
          ...snapshot.ui,
          rematchPrompt
        }
      }));
    }
  });

  socket.on(SOCKET_EVENTS.CONNECT, handlers.onConnect);
  socket.on(SOCKET_EVENTS.ROOM_READY, handlers.onRoomReady);
  socket.on(SOCKET_EVENTS.ROOM_STARTING, handlers.onRoomStarting);
  socket.on(SOCKET_EVENTS.ROOM_STATE_UPDATED, handlers.onRoomState);
  socket.on(SOCKET_EVENTS.CYCLE_FOUND, handlers.onCycleFound);
  socket.on(SOCKET_EVENTS.DRAW_REQUESTED, handlers.onDrawRequested);
  socket.on(SOCKET_EVENTS.DRAW_STATUS, handlers.onDrawStatus);
  socket.on(SOCKET_EVENTS.REMATCH_REQUESTED, handlers.onRematchRequested);
  socket.on(SOCKET_EVENTS.REMATCH_STATUS, handlers.onRematchStatus);
  socket.on(SOCKET_EVENTS.PLAYER_OFFLINE, handlers.onPlayerOffline);
  socket.on(SOCKET_EVENTS.PLAYER_TIMEOUT_WARNING, handlers.onPlayerTimeoutWarning);
  socket.on(SOCKET_EVENTS.PLAYER_LEFT, handlers.onPlayerLeft);
  socket.on(SOCKET_EVENTS.DISCONNECT, handlers.onDisconnect);

  return () => {
    socket.off(SOCKET_EVENTS.CONNECT, handlers.onConnect);
    socket.off(SOCKET_EVENTS.ROOM_READY, handlers.onRoomReady);
    socket.off(SOCKET_EVENTS.ROOM_STARTING, handlers.onRoomStarting);
    socket.off(SOCKET_EVENTS.ROOM_STATE_UPDATED, handlers.onRoomState);
    socket.off(SOCKET_EVENTS.CYCLE_FOUND, handlers.onCycleFound);
    socket.off(SOCKET_EVENTS.DRAW_REQUESTED, handlers.onDrawRequested);
    socket.off(SOCKET_EVENTS.DRAW_STATUS, handlers.onDrawStatus);
    socket.off(SOCKET_EVENTS.REMATCH_REQUESTED, handlers.onRematchRequested);
    socket.off(SOCKET_EVENTS.REMATCH_STATUS, handlers.onRematchStatus);
    socket.off(SOCKET_EVENTS.PLAYER_OFFLINE, handlers.onPlayerOffline);
    socket.off(SOCKET_EVENTS.PLAYER_TIMEOUT_WARNING, handlers.onPlayerTimeoutWarning);
    socket.off(SOCKET_EVENTS.PLAYER_LEFT, handlers.onPlayerLeft);
    socket.off(SOCKET_EVENTS.DISCONNECT, handlers.onDisconnect);
  };
}
