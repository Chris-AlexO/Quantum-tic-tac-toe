import { GAME_ACTIONS } from "../../../shared/game/actions.js";
import { createLocalRuntimeStore, getLocalPlayerName } from "./localGameState.js";
import { handleLocalCollapse, handleLocalMove } from "./localGameReducer.js";
import { createLocalGamePersistence } from "./localGamePersistence.js";
import { createLocalGameTimer } from "./localGameTimer.js";
import { createLocalMatchLifecycle } from "./localMatchLifecycle.js";

export function createLocalGameController({
  appConfig = null,
  gameClient = null,
  sessionStore
} = {}) {
  const runtime = createLocalRuntimeStore();
  const persistence = createLocalGamePersistence({
    appConfig,
    gameClient,
    getPlayerName: getLocalPlayerName
  });
  const timer = createLocalGameTimer({
    getSnapshot: sessionStore.getSnapshot,
    patchSnapshot: sessionStore.patch,
    clearStoredTimer: sessionStore.clearTimeInterval
  });
  const lifecycle = createLocalMatchLifecycle({
    persistence,
    runtime,
    sessionStore,
    timer
  });

  function handleAction(state, action) {
    if (action.type === GAME_ACTIONS.BOARD_CELL_CLICK) {
      return handleLocalMove({
        state,
        cellIndex: action.cellIndex,
        runtime,
        publish: lifecycle.publish
      });
    }

    if (action.type === GAME_ACTIONS.COLLAPSE_SYMBOL_CLICK) {
      return handleLocalCollapse({
        state,
        cellIndex: action.cellIndex,
        symbol: action.symbol,
        runtime,
        publish: lifecycle.publish
      });
    }

    return "LOCKED";
  }

  return {
    hydrateOrStart: lifecycle.hydrateOrStart,
    startMatch: lifecycle.startMatch,
    restart: lifecycle.startMatch,
    rematch: lifecycle.startMatch,
    startCountdown: lifecycle.startCountdown,
    skipCountdown: () => lifecycle.startCountdown({ skip: true }),
    handleAction,
    stop: lifecycle.stop
  };
}
