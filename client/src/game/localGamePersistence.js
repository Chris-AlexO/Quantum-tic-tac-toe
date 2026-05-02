import {
  cloneBoard,
  cloneBoardHistory
} from "../../../shared/game/localGameDomain.js";

export function createLocalGamePersistence({ appConfig = null, gameClient = null, getPlayerName }) {
  let lastSerializedSnapshot = null;

  function canPersist() {
    return Boolean(
      appConfig?.dbAvailable &&
      gameClient?.getLocalGameSnapshot &&
      gameClient?.saveLocalGameSnapshot &&
      gameClient?.clearLocalGameSnapshot
    );
  }

  function resetCache() {
    lastSerializedSnapshot = null;
  }

  async function load() {
    if (!canPersist()) {
      return null;
    }

    return gameClient.getLocalGameSnapshot();
  }

  async function persist(sourceState, runtime) {
    if (!canPersist()) {
      resetCache();
      return null;
    }

    const snapshot = buildPersistedSnapshot(sourceState, runtime);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSerializedSnapshot) {
      return true;
    }

    try {
      await gameClient.saveLocalGameSnapshot({
        playerName: getPlayerName(sourceState),
        snapshot
      });
      lastSerializedSnapshot = serialized;
      return true;
    } catch {
      resetCache();
      return null;
    }
  }

  async function clear() {
    resetCache();
    if (!canPersist()) {
      return null;
    }

    try {
      return await gameClient.clearLocalGameSnapshot();
    } catch {
      return null;
    }
  }

  return {
    canPersist,
    clear,
    load,
    persist,
    readRuntimeSnapshot,
    resetCache
  };
}

function buildPersistedSnapshot(sourceState, runtime) {
  return {
    version: 1,
    state: snapshotStateForPersistence(sourceState),
    runtime: {
      moves: runtime.moves.map(move => ({ ...move })),
      symbolIndex: Array.from(runtime.symbolIndex.entries()).map(([symbol, squares]) => [
        symbol,
        Array.isArray(squares) ? [...squares] : []
      ])
    }
  };
}

function snapshotStateForPersistence(sourceState) {
  return {
    session: {
      ...sourceState.session
    },
    players: {
      me: { ...sourceState.players.me },
      opponent: { ...sourceState.players.opponent }
    },
    game: {
      ...sourceState.game,
      board: cloneBoard(sourceState.game.board),
      cyclePath: clonePairArray(sourceState.game.cyclePath),
      collapseChoices: clonePairArray(sourceState.game.collapseChoices),
      winningLine: Array.isArray(sourceState.game.winningLine)
        ? sourceState.game.winningLine.map(line => (Array.isArray(line) ? [...line] : line))
        : sourceState.game.winningLine
    },
    boardHistory: cloneBoardHistory(sourceState.boardHistory ?? [])
  };
}

function readRuntimeSnapshot(snapshot) {
  return {
    moves: Array.isArray(snapshot?.runtime?.moves)
      ? snapshot.runtime.moves.map(move => ({ ...move }))
      : [],
    symbolIndex: new Map(
      Array.isArray(snapshot?.runtime?.symbolIndex)
        ? snapshot.runtime.symbolIndex.map(([symbol, squares]) => [
            symbol,
            Array.isArray(squares) ? [...squares] : []
          ])
        : []
    )
  };
}

function clonePairArray(value) {
  return Array.isArray(value) ? value.map(step => [...step]) : value;
}
