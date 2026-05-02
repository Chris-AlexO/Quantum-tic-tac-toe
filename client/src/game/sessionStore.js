import {
  getPreferredRuleset,
  getSavedPlayerName
} from "../lib/playerProfile.js";
import { removeSessionValue } from "../lib/browserStorage.js";
import {
  createInitialGameSessionSnapshot as createSharedInitialGameSessionSnapshot,
  createViewportSnapshot,
  normalizeHistoryIndex,
  normalizeServerGameSnapshot
} from "../../../shared/game/sessionModel.js";

// Imperative runtime store for the current game session.
// Socket handlers, local-game controllers, timers, and actions write here;
// React reads it through useGameSessionState().
export function createGameSessionStore() {
  let currentSnapshot = buildInitialSnapshot();
  const listeners = new Set();

  // Kept in the useSyncExternalStore shape so React can subscribe safely
  // without forcing socket/timer code into component state.
  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot() {
    return currentSnapshot;
  }

  function createInitialSnapshot() {
    return buildInitialSnapshot();
  }

  function getToastMessage() {
    return currentSnapshot.ui.toastMessage;
  }

  function setToastMessage(message) {
    updateSnapshot(snapshot => ({
      ...snapshot,
      ui: {
        ...snapshot.ui,
        toastMessage: message
      }
    }));
  }

  function setSnapshot(nextSnapshot) {
    replaceSnapshot(nextSnapshot);
  }

  function patch(updater) {
    const nextSnapshot = typeof updater === "function" ? updater(currentSnapshot) : updater;
    setSnapshot(nextSnapshot);
  }

  function resetForMenu() {
    removeSessionValue("roomId");
    replaceSnapshot(createInitialSnapshot());
  }

  function setPlayerName(name) {
    patch(snapshot => ({
      ...snapshot,
      players: {
        ...snapshot.players,
        me: {
          ...snapshot.players.me,
          name
        }
      }
    }));
  }

  function setHistoryIndex(historyIndex) {
    const nextHistoryIndex = normalizeHistoryIndex(historyIndex, currentSnapshot.boardHistory);
    updateSnapshot(snapshot => ({
      ...snapshot,
      ui: {
        ...snapshot.ui,
        historyIndex: nextHistoryIndex
      }
    }));
  }

  function getTimeInterval() {
    return currentSnapshot.timeInterval;
  }

  function clearTimeInterval() {
    clearCurrentTimer();
    updateSnapshot(snapshot => ({
      ...snapshot,
      timeInterval: null
    }));
  }

  function applyServerState(serverState, mark, role = currentSnapshot.session.role) {
    const nextSnapshot = normalizeServerState(serverState, mark, role);
    const timeInterval = createMultiplayerTimer(serverState);

    replaceSnapshot({
      ...nextSnapshot,
      timeInterval
    });
  }

  function updateSnapshot(nextSnapshotOrUpdater) {
    currentSnapshot =
      typeof nextSnapshotOrUpdater === "function"
        ? nextSnapshotOrUpdater(currentSnapshot)
        : nextSnapshotOrUpdater;
    notifyListeners();
  }

  function normalizeServerState(serverState, mark, role = currentSnapshot.session.role) {
    return normalizeServerGameSnapshot(serverState, {
      mark,
      role,
      currentSnapshot,
      fallbackRuleset: getPreferredRuleset(),
      defaultPlayerName: getDefaultPlayerName(),
      viewport: createViewportSnapshot()
    });
  }

  function createMultiplayerTimer(serverState) {
    clearCurrentTimer();

    if (serverState.session.status !== "playing" || serverState.game.winner) {
      return null;
    }

    return setInterval(() => {
      const liveState = getSnapshot();

      if (liveState.session.type !== "mp" || liveState.session.status !== "playing") {
        clearTimeInterval();
        return;
      }

      const targetKey = liveState.game.turn === liveState.players.me.mark ? "me" : "opponent";
      const currentTime = liveState.players[targetKey].time;
      const nextTime = Math.max(0, currentTime - 1);

      updateSnapshot({
        ...liveState,
        players: {
          ...liveState.players,
          [targetKey]: {
            ...liveState.players[targetKey],
            time: nextTime
          }
        }
      });
    }, 1000);
  }

  function clearCurrentTimer() {
    if (currentSnapshot.timeInterval) {
      clearInterval(currentSnapshot.timeInterval);
    }
  }

  function replaceSnapshot(nextSnapshot) {
    if (currentSnapshot.timeInterval && currentSnapshot.timeInterval !== nextSnapshot.timeInterval) {
      clearInterval(currentSnapshot.timeInterval);
    }

    currentSnapshot = nextSnapshot;
    notifyListeners();
  }

  function notifyListeners() {
    listeners.forEach(listener => listener());
  }

  return {
    applyServerState,
    clearTimeInterval,
    createInitialSnapshot,
    getSnapshot,
    getTimeInterval,
    getToastMessage,
    patch,
    resetForMenu,
    setHistoryIndex,
    setPlayerName,
    setSnapshot,
    setToastMessage,
    subscribe
  };
}

function getDefaultPlayerName() {
  return getSavedPlayerName() || "Player 1";
}

function buildInitialSnapshot() {
  return createSharedInitialGameSessionSnapshot({
    playerName: getDefaultPlayerName(),
    ruleset: getPreferredRuleset(),
    viewport: createViewportSnapshot()
  });
}
