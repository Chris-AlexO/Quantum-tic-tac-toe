import { GAME_ACTIONS } from "../../../shared/game/actions.js";
import { getSavedPlayerName } from "../lib/playerProfile.js";

export function createGameActions({
  appConfig,
  gameClient,
  localGame,
  refreshAppConfig,
  router,
  sessionStore
}) {
  const context = createActionContext({
    appConfig,
    gameClient,
    localGame,
    refreshAppConfig,
    router,
    sessionStore
  });
  const commands = {
    ...createNavigationCommands(context),
    ...createMatchCommands(context)
  };

  return {
    handleAction: createBoardActions(context),
    async handleButtonAction(action) {
      return commands[action.type]?.(action);
    }
  };
}

function createActionContext({
  appConfig,
  gameClient,
  localGame,
  refreshAppConfig,
  router,
  sessionStore
}) {
  const routeToExistingGame = (
    state,
    message = "Finish your current match before starting another one."
  ) => {
    if (!state?.session?.roomId) return false;

    sessionStore.setToastMessage(message);
    router.go(state.session.type === "local" ? "/game/local" : `/game/mp/${state.session.roomId}`);
    return true;
  };

  return {
    appConfig,
    gameClient,
    localGame,
    refreshAppConfig,
    router,
    sessionStore,

    async ensureMultiplayerReady() {
      const nextAppConfig = (await refreshAppConfig?.()) ?? appConfig;

      if (!nextAppConfig?.multiplayerEnabled) {
        sessionStore.setToastMessage("PostgreSQL is offline. Only local games are available.");
        return false;
      }

      if (!getSavedPlayerName()) {
        sessionStore.setToastMessage("Save a clean player name before starting a multiplayer game.");
        return false;
      }

      return true;
    },

    getActivePlayerSession() {
      const state = sessionStore.getSnapshot();
      if (
        state.session.role !== "player" ||
        !state.session.roomId ||
        !["waiting", "starting", "playing"].includes(state.session.status)
      ) {
        return null;
      }

      return state;
    },

    routeToExistingGame,

    handleOccupiedAck(ack) {
      if (!ack?.roomId || !ack?.state) return false;

      const state = sessionStore.getSnapshot();
      return routeToExistingGame(
        {
          ...state,
          session: {
            ...state.session,
            roomId: ack.roomId,
            type: ack.state.session?.type ?? "mp",
            status: ack.state.session?.status ?? "playing",
            role: ack.role ?? "player"
          }
        },
        ack.message || "Finish your current match before starting another one."
      );
    }
  };
}

function createBoardActions({ gameClient, localGame, sessionStore }) {
  let pendingBoardAction = false;

  return async function handleBoardAction(state, action) {
    const mode = computeInteractionMode(state);

    if (mode === "LOCKED") return mode;
    if (pendingBoardAction) return "PENDING";

    switch (action.type) {
      case GAME_ACTIONS.BOARD_CELL_CLICK:
        if (mode !== "MOVE") return mode;
        if (state.session.type === "local") {
          return localGame.handleAction(state, action);
        }

        pendingBoardAction = true;
        try {
          await gameClient.sendMove(action.cellIndex);
          return mode;
        } catch (error) {
          sessionStore.setToastMessage(error?.message || "Move rejected. Try again.");
          return "REJECTED";
        } finally {
          pendingBoardAction = false;
        }

      case GAME_ACTIONS.COLLAPSE_SYMBOL_CLICK:
        if (mode !== "COLLAPSE") return mode;
        if (state.session.type === "local") {
          return localGame.handleAction(state, action);
        }

        pendingBoardAction = true;
        try {
          await gameClient.sendCollapse(action.cellIndex, action.symbol);
          return mode;
        } catch (error) {
          sessionStore.setToastMessage(error?.message || "Collapse rejected. Try again.");
          return "REJECTED";
        } finally {
          pendingBoardAction = false;
        }

      default:
        return mode;
    }
  };
}

function createNavigationCommands(context) {
  const {
    gameClient,
    ensureMultiplayerReady,
    getActivePlayerSession,
    handleOccupiedAck,
    localGame,
    routeToExistingGame,
    router,
    sessionStore
  } = context;

  return {
    [GAME_ACTIONS.MAIN_MENU]() {
      if (sessionStore.getSnapshot().session.type === "local") {
        localGame.stop({ clearPersisted: true });
        sessionStore.clearTimeInterval();
        sessionStore.resetForMenu();
      }
      router.go("/");
    },

    async [GAME_ACTIONS.LEAVE_GAME](action) {
      if (sessionStore.getSnapshot().session.type === "local") {
        localGame.stop({ clearPersisted: true });
        sessionStore.clearTimeInterval();
        sessionStore.resetForMenu();
        router.go("/");
        return;
      }

      const ack = await gameClient.leaveGame({ forfeit: Boolean(action.forfeit) });
      if (!ack) {
        sessionStore.setToastMessage("Unable to leave the game right now.");
        return;
      }

      if (ack.status === "confirm_forfeit") {
        sessionStore.setToastMessage(ack.message || "Leaving now will forfeit the match.");
        return;
      }

      sessionStore.clearTimeInterval();
      sessionStore.resetForMenu();
      router.go("/");
    },

    async [GAME_ACTIONS.JOIN_MATCH](action) {
      if (!await ensureMultiplayerReady()) return;

      if (!action.roomId) {
        sessionStore.setToastMessage("Enter a room id to continue.");
        return;
      }

      if (!action.force && redirectActiveSessionIfNeeded(action, {
        getActivePlayerSession,
        routeToExistingGame
      })) {
        return;
      }

      const ack = await gameClient.joinRoomById(action.roomId);
      if (!ack) {
        sessionStore.setToastMessage("That room does not exist.");
        return;
      }

      if (ack.status === "occupied") {
        handleOccupiedAck(ack);
        return;
      }

      router.go(`/game/mp/${ack.roomId}`);
    },

    [GAME_ACTIONS.OPEN_EXISTING_GAME](action) {
      if (!action.roomId && action.local !== true) return;

      sessionStore.setToastMessage(
        action.message || "Finish your current match before starting another one."
      );

      if (action.local) {
        action.replace ? router.replace("/game/local") : router.go("/game/local");
        return;
      }

      const path = `/game/mp/${action.roomId}`;
      action.replace ? router.replace(path) : router.go(path);
    }
  };
}

function createMatchCommands({ gameClient, localGame, sessionStore }) {
  async function startGame({ skipCountdown = false } = {}) {
    const state = sessionStore.getSnapshot();

    if (state.session.type === "local") {
      if (skipCountdown) {
        localGame.skipCountdown();
        return;
      }

      localGame.startCountdown();
      return;
    }

    const ack = await gameClient.clientReady(state.session.roomId);
    if (!ack?.state) {
      sessionStore.setToastMessage("Unable to start right now.");
      return;
    }

    sessionStore.applyServerState(
      ack.state,
      ack.mark ?? state.session.playerMark,
      ack.role ?? state.session.role
    );
  }

  async function requestRematch() {
    if (sessionStore.getSnapshot().session.type === "local") {
      localGame.rematch();
      return;
    }

    const ack = await gameClient.requestRematch();
    if (!ack) {
      sessionStore.setToastMessage("Unable to send rematch request right now.");
    }
  }

  return {
    [GAME_ACTIONS.START_GAME]: () => startGame(),
    [GAME_ACTIONS.SKIP_COUNTDOWN]: () => startGame({ skipCountdown: true }),
    [GAME_ACTIONS.REMATCH]: requestRematch,
    [GAME_ACTIONS.REMATCH_REQUEST]: requestRematch,

    async [GAME_ACTIONS.REMATCH_ACCEPT]() {
      const ack = await gameClient.respondToRematch(true);
      if (!ack) {
        sessionStore.setToastMessage("Unable to accept the rematch right now.");
      }
    },

    async [GAME_ACTIONS.REMATCH_DECLINE]() {
      const ack = await gameClient.respondToRematch(false);
      if (!ack) {
        sessionStore.setToastMessage("Unable to decline the rematch right now.");
      }
    },

    [GAME_ACTIONS.LOCAL_RESTART]() {
      localGame.restart();
      sessionStore.setToastMessage("Local match restarted.");
    },

    async [GAME_ACTIONS.DRAW_REQUEST]() {
      const ack = await gameClient.requestDraw();
      if (!ack) {
        sessionStore.setToastMessage("Unable to send the draw request right now.");
      }
    },

    async [GAME_ACTIONS.DRAW_ACCEPT]() {
      const ack = await gameClient.respondToDraw(true);
      if (!ack) {
        sessionStore.setToastMessage("Unable to accept the draw right now.");
      }
    },

    async [GAME_ACTIONS.DRAW_DECLINE]() {
      const ack = await gameClient.respondToDraw(false);
      if (!ack) {
        sessionStore.setToastMessage("Unable to decline the draw right now.");
      }
    }
  };
}

function computeInteractionMode(state) {
  if (state.session.status !== "playing") return "LOCKED";
  if (state.session.role === "spectator") return "LOCKED";
  if (state.session.type !== "local" && state.players.me.mark !== state.game.turn) return "LOCKED";
  if (state.game.nextAction === "move") return "MOVE";
  if (state.game.nextAction === "collapse") return "COLLAPSE";
  if (state.game.nextAction === "winner") return "WINNER";
  return "LOCKED";
}

function redirectActiveSessionIfNeeded(action, { getActivePlayerSession, routeToExistingGame }) {
  const activeSession = getActivePlayerSession();
  if (
    activeSession &&
    activeSession.session.type === "mp" &&
    activeSession.session.roomId !== action.roomId
  ) {
    routeToExistingGame(activeSession, "Finish your current match before opening another room.");
    return true;
  }

  if (activeSession?.session.type === "local") {
    routeToExistingGame(activeSession, "Finish your current local match before opening a live room.");
    return true;
  }

  return false;
}
