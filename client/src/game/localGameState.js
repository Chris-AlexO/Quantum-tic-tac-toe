import { getPreferredRuleset, getSavedPlayerName } from "../lib/playerProfile.js";
import {
  cloneBoard,
  createBoard,
  TURN_SECONDS
} from "../../../shared/game/localGameDomain.js";

export function createLocalRuntimeStore() {
  let moves = [];
  let symbolIndex = new Map();
  let startTimeout = null;

  return {
    get moves() {
      return moves;
    },
    get symbolIndex() {
      return symbolIndex;
    },
    get startTimeout() {
      return startTimeout;
    },
    set startTimeout(timeout) {
      startTimeout = timeout;
    },
    reset() {
      moves = [];
      symbolIndex = new Map();
    },
    restore({ moves: restoredMoves = [], symbolIndex: restoredSymbolIndex = new Map() } = {}) {
      moves = restoredMoves;
      symbolIndex = restoredSymbolIndex;
    },
    clearStartTimeout() {
      if (startTimeout) {
        clearTimeout(startTimeout);
        startTimeout = null;
      }
    }
  };
}

export function getLocalPlayerName(snapshot) {
  return getSavedPlayerName() || snapshot.players.me.name;
}

export function buildLocalState(previousState, ruleset = getPreferredRuleset()) {
  const localName = getLocalPlayerName(previousState);
  const opponentName =
    previousState?.players?.opponent?.name &&
    previousState.players.opponent.connectionStatus !== "offline"
      ? previousState.players.opponent.name
      : "Player O";

  const initialBoard = createBoard();

  return {
    ...previousState,
    session: {
      roomId: "local",
      roomReady: true,
      status: "waiting",
      host: true,
      type: "local",
      ruleset,
      countdownEndsAt: null,
      disconnectState: null,
      role: "player",
      playerMark: "X",
      rematchRequest: null,
      drawRequest: null
    },
    players: {
      me: {
        name: localName || "Player X",
        connectionStatus: "connected",
        time: TURN_SECONDS,
        mark: "X"
      },
      opponent: {
        name: opponentName,
        connectionStatus: "connected",
        time: TURN_SECONDS,
        mark: "O"
      }
    },
    timeInterval: null,
    game: {
      board: initialBoard,
      cyclePath: null,
      collapseChoices: null,
      turn: "X",
      winner: null,
      winningLine: null,
      nextAction: "move"
    },
    boardHistory: [cloneBoard(initialBoard)],
    ui: {
      ...previousState.ui,
      historyIndex: null,
      toastMessage: null,
      modalMessage: null,
      rematchPrompt: null
    }
  };
}
