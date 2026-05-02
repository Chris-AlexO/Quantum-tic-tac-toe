/**
 * @typedef {import("./types.js").GameSessionSnapshot} GameSessionSnapshot
 * @typedef {import("./types.js").ServerRoomSnapshot} ServerRoomSnapshot
 */

export function createViewportSnapshot() {
  if (typeof window === "undefined") {
    return { w: 0, h: 0 };
  }

  return { w: window.innerWidth, h: window.innerHeight };
}

export function createInitialGameSessionSnapshot({
  playerName = "Player 1",
  ruleset = null,
  viewport = createViewportSnapshot()
} = {}) {
  /** @type {GameSessionSnapshot} */
  return {
    session: {
      roomId: null,
      roomReady: false,
      status: "waiting",
      host: false,
      type: null,
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
        name: playerName,
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
      viewport,
      toastMessage: null,
      modalMessage: null,
      view: null,
      rematchPrompt: null,
      historyIndex: null
    }
  };
}

export function normalizeHistoryIndex(historyIndex, boardHistory) {
  if (historyIndex == null) {
    return null;
  }

  if (!Array.isArray(boardHistory) || boardHistory.length < 2) {
    return null;
  }

  const lastHistoricalIndex = boardHistory.length - 2;
  if (lastHistoricalIndex < 0) {
    return null;
  }

  return Math.max(0, Math.min(historyIndex, lastHistoricalIndex));
}

export function normalizeServerGameSnapshot(
  serverState,
  {
    mark,
    role = mark ? "player" : "spectator",
    currentSnapshot = null,
    fallbackRuleset = null,
    defaultPlayerName = "Player 1",
    viewport = createViewportSnapshot()
  } = {}
) {
  const snapshot = currentSnapshot ?? createInitialGameSessionSnapshot({
    playerName: defaultPlayerName,
    ruleset: fallbackRuleset,
    viewport
  });
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
      ruleset:
        serverState.session.ruleset ??
        snapshot.session.ruleset ??
        fallbackRuleset,
      countdownEndsAt: serverState.session.countdownEndsAt ?? null,
      disconnectState: serverState.session.disconnectState
        ? { ...serverState.session.disconnectState }
        : null,
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
        name: serverState.players[meMark]?.name || defaultPlayerName,
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
    timeInterval: null,
    game: { ...serverState.game },
    boardHistory,
    ui: {
      ...snapshot.ui,
      viewport,
      rematchPrompt: snapshot.ui.rematchPrompt ? { ...snapshot.ui.rematchPrompt } : null,
      historyIndex: normalizeHistoryIndex(snapshot.ui.historyIndex, boardHistory)
    }
  };
}
