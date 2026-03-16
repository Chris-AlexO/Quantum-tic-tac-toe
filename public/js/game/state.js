import { getRoomIdFromURL } from "../network/sock.js";

function createInitialState() {
  return {
    session: {
      roomId: null,
      roomReady: false,
      status: "waiting",
      host: false,
      type: null,
      ruleset: null,
      countdownEndsAt: null,
      role: "player",
      playerMark: "X",
      rematchRequest: null,
      drawRequest: null
    },
    players: {
      me: {
        name: localStorage.getItem("playerName") || "Player 1",
        connectionStatus: "connected",
        time: 600,
        mark: "X"
      },
      opponent: {
        name: "Searching...",
        connectionStatus: "offline",
        time: 600,
        mark: "O"
      }
    },
    timeInterval: null,
    game: {
      board: null,
      cyclePath: null,
      collapseChoices: null,
      turn: null,
      winner: null,
      winningLine: null,
      nextAction: null
    },
    boardHistory: [],
    ui: {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      toastMessage: null,
      modalMessage: null,
      view: null,
      rematchPrompt: null,
      historyIndex: null
    }
  };
}

const state = createInitialState();
const listeners = new Set();

function cloneBoardSnapshot(board) {
  return Array.isArray(board)
    ? board.map(cell => (Array.isArray(cell) ? [...cell] : cell))
    : board;
}

function normalizeHistoryIndex(historyIndex, boardHistory) {
  if (historyIndex == null) return null;
  if (!Array.isArray(boardHistory) || boardHistory.length < 2) return null;

  const lastHistoricalIndex = boardHistory.length - 2;
  if (lastHistoricalIndex < 0) return null;

  return Math.max(0, Math.min(historyIndex, lastHistoricalIndex));
}

function cloneState() {
  return {
    ...state,
    session: {
      ...state.session,
      drawRequest: state.session.drawRequest
        ? { ...state.session.drawRequest }
        : null,
      rematchRequest: state.session.rematchRequest
        ? { ...state.session.rematchRequest }
        : null
    },
    players: {
      me: { ...state.players.me },
      opponent: { ...state.players.opponent }
    },
    game: {
      ...state.game,
      board: cloneBoardSnapshot(state.game.board),
      cyclePath: Array.isArray(state.game.cyclePath)
        ? state.game.cyclePath.map(step => [...step])
        : state.game.cyclePath,
      collapseChoices: Array.isArray(state.game.collapseChoices)
        ? state.game.collapseChoices.map(step => [...step])
        : state.game.collapseChoices,
      winningLine: Array.isArray(state.game.winningLine)
        ? state.game.winningLine.map(line => (Array.isArray(line) ? [...line] : line))
        : state.game.winningLine
    },
    boardHistory: Array.isArray(state.boardHistory)
      ? state.boardHistory.map(board => cloneBoardSnapshot(board))
      : [],
    ui: {
      ...state.ui,
      viewport: { ...state.ui.viewport },
      rematchPrompt: state.ui.rematchPrompt ? { ...state.ui.rematchPrompt } : null,
      historyIndex: state.ui.historyIndex
    }
  };
}

export function getState() {
  return cloneState();
}

export function patchState(patch) {
  let changed = false;

  for (const [key, value] of Object.entries(patch)) {
    if (state[key] !== value) {
      state[key] = value;
      changed = true;
    }
  }

  if (changed) {
    listeners.forEach(fn => fn(getState()));
  }
}

export function setState(newState) {
  const next = { ...createInitialState(), ...newState };
  patchState(next);
  return next;
}

export function resetStateForMenu() {
  return setState(createInitialState());
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(getState());
  return () => listeners.delete(fn);
}

export function getOrMakePlayerId() {
  const key = "playerId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function normalizeServerState(serverState, mark, role = mark ? "player" : "spectator") {
  const isPlayer = role !== "spectator" && (mark === "X" || mark === "O");
  const meMark = isPlayer ? mark : "X";
  const opponentMark = meMark === "X" ? "O" : "X";
  const boardHistory = serverState.boardHistory ?? [];

  return {
    session: {
      roomId: serverState.session.roomId,
      roomReady: serverState.session.status !== "waiting",
      status: serverState.session.status,
      host: serverState.session.host,
      type: serverState.session.type,
      ruleset: serverState.session.ruleset ?? state.session.ruleset ?? getPreferredRuleset(),
      countdownEndsAt: serverState.session.countdownEndsAt ?? null,
      role,
      playerMark: isPlayer ? mark : null,
      drawRequest: serverState.session.drawRequest
        ? { ...serverState.session.drawRequest }
        : null,
      rematchRequest: serverState.session.rematchRequest
        ? { ...serverState.session.rematchRequest }
        : null
    },
    players: {
      me: {
        name: serverState.players[meMark]?.name || localStorage.getItem("playerName") || "Player 1",
        connectionStatus: serverState.players[meMark]?.connectionStatus || "connected",
        time: serverState.players[meMark]?.timeLeft ?? 600,
        mark: meMark
      },
      opponent: {
        name: serverState.players[opponentMark]?.name || "Opponent",
        connectionStatus: serverState.players[opponentMark]?.connectionStatus || "offline",
        time: serverState.players[opponentMark]?.timeLeft ?? 600,
        mark: opponentMark
      }
    },
    game: { ...serverState.game },
    boardHistory,
    ui: {
      ...state.ui,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      rematchPrompt: state.ui.rematchPrompt ? { ...state.ui.rematchPrompt } : null,
      historyIndex: normalizeHistoryIndex(state.ui.historyIndex, boardHistory)
    }
  };
}

export function updateClientState(newState, mark, role = state.session.role) {
  setState({
    ...normalizeServerState(newState, mark, role),
    timeInterval: newState.timeInterval ?? state.timeInterval
  });
}

export function handleServerStateUpdate(serverState, mark, role = state.session.role) {
  if (mark && role !== "spectator") {
    setMark(mark);
  }

  const prevTimeInterval = getTimeInterval();
  if (prevTimeInterval) {
    clearInterval(prevTimeInterval);
  }

  let timeInterval = null;

  if (serverState.session.status === "playing" && !serverState.game.winner) {
    timeInterval = setInterval(() => {
      const liveState = getState();
      if (liveState.session.type !== "mp" || liveState.session.status !== "playing") {
        clearInterval(timeInterval);
        setTimeInterval(null);
        return;
      }

      if (liveState.game.turn === liveState.players.me.mark) {
        setPlayerTime(Math.max(0, getPlayerTime() - 1));
      } else {
        setOpponentTime(Math.max(0, getOpponentTime() - 1));
      }
    }, 1000);
  }

  updateClientState({ ...serverState, timeInterval }, mark, role);
}

export const getSockID = () => null;
export const setSockID = () => null;

function setRoomURL(id) {
  history.replaceState({}, "", `/game/mp/${id}`);
}

export const getRoomId = () =>
  state.session.roomId ||
  sessionStorage.getItem("roomId") ||
  getRoomIdFromURL() ||
  null;

export const setRoomId = id => {
  patchState({
    session: {
      ...state.session,
      roomId: id
    }
  });

  if (id) {
    sessionStorage.setItem("roomId", id);
    if (state.session.type === "mp") {
      setRoomURL(id);
    }
  }
};

export const getRoomReady = () => state.session.roomReady;
export const setRoomReady = ready =>
  patchState({
    session: {
      ...state.session,
      roomReady: ready
    }
  });

export const getGameStatus = () => state.session.status;
export const setGameStatus = status =>
  patchState({
    session: {
      ...state.session,
      status
    }
  });

export const getPlayerName = () => localStorage.getItem("playerName") || state.players.me.name;
export function getPreferredRuleset() {
  return localStorage.getItem("preferredRuleset") || "house";
}
export function setPreferredRuleset(ruleset) {
  localStorage.setItem("preferredRuleset", ruleset);
  patchState({
    session: {
      ...state.session,
      ruleset: state.session.type ? state.session.ruleset : ruleset
    }
  });
}
export const setPlayerName = name => {
  localStorage.setItem("playerName", name);
  patchState({
    players: {
      ...state.players,
      me: {
        ...state.players.me,
        name
      }
    }
  });
};

export const getOpponentName = () => state.players.opponent.name;
export const setOpponentName = name =>
  patchState({
    players: {
      ...state.players,
      opponent: {
        ...state.players.opponent,
        name
      }
    }
  });

export const getMark = () => state.players.me.mark;
export const setMark = mark =>
  patchState({
    players: {
      ...state.players,
      me: {
        ...state.players.me,
        mark
      }
    }
  });

export const setTurn = turn =>
  patchState({
    game: {
      ...state.game,
      turn
    }
  });

export const getTurn = () => state.game.turn;

export const getBoard = () => state.game.board;
export const setBoard = board =>
  patchState({
    game: {
      ...state.game,
      board
    }
  });

export const getOnCellClick = () => null;
export const setOnCellClick = () => null;

export const getNextAction = () => state.game.nextAction;
export const setNextAction = action =>
  patchState({
    game: {
      ...state.game,
      nextAction: action
    }
  });

export const getOnSymbolClick = () => null;
export const setOnSymbolClick = () => null;

export const setWinner = winner =>
  patchState({
    game: {
      ...state.game,
      winner
    }
  });

export const getWinner = () => state.game.winner;

export const getWinningLine = () => state.game.winningLine;
export const setWinningLine = line =>
  patchState({
    game: {
      ...state.game,
      winningLine: line
    }
  });

export const getToastMessage = () => state.ui.toastMessage;
export const setToastMessage = message =>
  patchState({
    ui: {
      ...state.ui,
      toastMessage: message
    }
  });

export const setModalMessage = message =>
  patchState({
    ui: {
      ...state.ui,
      modalMessage: message
    }
  });

export const getModalMessage = () => state.ui.modalMessage;

export const getView = () => state.ui.view;
export const setView = view =>
  patchState({
    ui: {
      ...state.ui,
      view
    }
  });

export const getRematchPrompt = () => state.ui.rematchPrompt;
export const setRematchPrompt = rematchPrompt =>
  patchState({
    ui: {
      ...state.ui,
      rematchPrompt
    }
  });

export const setHost = isHost =>
  patchState({
    session: {
      ...state.session,
      host: isHost
    }
  });

export const getHost = () => state.session.host;

export const setCyclePath = cyclePath =>
  patchState({
    game: {
      ...state.game,
      cyclePath
    }
  });

export const getCyclePath = () => state.game.cyclePath;

export const getPlayerTime = () => state.players.me.time;
export const setPlayerTime = time =>
  patchState({
    players: {
      ...state.players,
      me: {
        ...state.players.me,
        time
      }
    }
  });

export const getOpponentTime = () => state.players.opponent.time;
export const setOpponentTime = time =>
  patchState({
    players: {
      ...state.players,
      opponent: {
        ...state.players.opponent,
        time
      }
    }
  });

export const getTimeInterval = () => state.timeInterval;
export const setTimeInterval = timerId => patchState({ timeInterval: timerId });

export const getHistoryIndex = () => state.ui.historyIndex;
export const setHistoryIndex = historyIndex =>
  patchState({
    ui: {
      ...state.ui,
      historyIndex: normalizeHistoryIndex(historyIndex, state.boardHistory)
    }
  });
