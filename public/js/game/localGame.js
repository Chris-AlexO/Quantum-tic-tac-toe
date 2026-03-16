import {
  getPlayerName,
  getPreferredRuleset,
  getState,
  setState,
  setTimeInterval
} from "./state.js";

const BOARD_SIZE = 9;
const INNER_BOARD_SIZE = 9;
const WINNING_LINES = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
  [1, 5, 9],
  [3, 5, 7]
];
const TURN_SECONDS = 600;
const MATCH_START_DELAY_MS = 3000;
const RULESETS = {
  HOUSE: "house",
  GOFF: "goff"
};

function classicalMarkOf(token) {
  return typeof token === "string" ? token.charAt(0) : null;
}

function subscriptOf(token) {
  if (typeof token !== "string") return 0;
  const match = token.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function classicalizeToken(token, ruleset = RULESETS.HOUSE) {
  if (ruleset === RULESETS.GOFF) {
    return token;
  }

  return classicalMarkOf(token);
}

function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: INNER_BOARD_SIZE }, () => null)
  );
}

function cloneBoard(board) {
  return board.map(cell => (Array.isArray(cell) ? [...cell] : cell));
}

function cloneBoardHistory(boardHistory) {
  return boardHistory.map(board => cloneBoard(board));
}

function getTwinIndex(i) {
  return i % 2 === 0 ? i + 1 : i - 1;
}

function checkForCycle(moves, bigSquare, bigSquareOfTwin, symbol) {
  if (moves.length < 2) {
    return { cycleFound: false, cyclePath: null };
  }

  const latestIdx = moves.length - 1;
  const stack = [
    {
      currentIdx: latestIdx,
      currentSquare: bigSquare,
      path: [[bigSquare, symbol]]
    }
  ];

  const visitedEdges = new Set();

  while (stack.length > 0) {
    const { currentIdx, currentSquare, path } = stack.pop();

    for (let i = 0; i < moves.length; i++) {
      if (i === currentIdx || moves[i].square !== currentSquare) continue;

      const edgeKey = `${currentIdx}->${i}`;
      if (visitedEdges.has(edgeKey)) continue;
      visitedEdges.add(edgeKey);

      const moveSymbol = moves[i].symbol;
      const twinIdx = getTwinIndex(i);

      if (twinIdx < 0 || twinIdx >= moves.length) continue;

      const twinSquare = moves[twinIdx].square;
      const newPath = [...path, [twinSquare, moveSymbol]];

      if (twinSquare === bigSquareOfTwin) {
        return { cycleFound: true, cyclePath: newPath };
      }

      stack.push({
        currentIdx: twinIdx,
        currentSquare: twinSquare,
        path: newPath
      });
    }
  }

  return { cycleFound: false, cyclePath: null };
}

function collapseEntanglement(symbolIndex, board, square, playerSymbol, {
  ruleset = RULESETS.HOUSE
} = {}) {
  const collapsedSymbols = new Set();
  const stack = [{ currentSquare: square, currentSymbol: playerSymbol }];

  while (stack.length > 0) {
    const { currentSquare, currentSymbol } = stack.pop();

    if (typeof board[currentSquare] === "string") continue;

    for (let j = 0; j < INNER_BOARD_SIZE; j++) {
      const symbol = board[currentSquare][j];
      if (symbol === null || collapsedSymbols.has(symbol) || symbol === currentSymbol) {
        continue;
      }

      const twinPair = symbolIndex.get(symbol);
      if (!twinPair) continue;

      const [firstTwinSquare, secondTwinSquare] = twinPair;
      const twinToCheck =
        firstTwinSquare === currentSquare ? secondTwinSquare : firstTwinSquare;

      stack.push({ currentSquare: twinToCheck, currentSymbol: symbol });
    }

    board[currentSquare] = classicalizeToken(currentSymbol, ruleset);

    collapsedSymbols.add(currentSymbol);
  }

  return board;
}

function resolveWinnerFromDetails(winningDetails, ruleset = RULESETS.HOUSE) {
  if (!winningDetails.length) {
    return null;
  }

  const distinctMarks = new Set(winningDetails.map(detail => detail.mark));
  if (distinctMarks.size === 1) {
    return winningDetails[0].mark;
  }

  if (ruleset !== RULESETS.GOFF) {
    return "draw";
  }

  const sorted = [...winningDetails].sort((a, b) => a.maxSubscript - b.maxSubscript);
  if (!sorted[1] || sorted[0].maxSubscript !== sorted[1].maxSubscript) {
    return sorted[0].mark;
  }

  return "draw";
}

function checkWinner(board, {
  ruleset = RULESETS.HOUSE
} = {}) {
  const winningCombos = [];
  const winningLines = [];
  const winningDetails = [];

  for (const win of WINNING_LINES) {
    const sq1 = board[win[0] - 1];
    const sq2 = board[win[1] - 1];
    const sq3 = board[win[2] - 1];

    if (
      typeof sq1 === "string" &&
      classicalMarkOf(sq1) === classicalMarkOf(sq2) &&
      classicalMarkOf(sq2) === classicalMarkOf(sq3)
    ) {
      winningCombos.push(win);
      winningLines.push(classicalMarkOf(sq1));
      winningDetails.push({
        mark: classicalMarkOf(sq1),
        maxSubscript: Math.max(subscriptOf(sq1), subscriptOf(sq2), subscriptOf(sq3))
      });
    }
  }

  return {
    winner: winningLines.length > 0,
    winningLines,
    winningCombos,
    winningDetails,
    resolvedWinner: resolveWinnerFromDetails(winningDetails, ruleset)
  };
}

function checkIfOneSquareRemains(board, turn, {
  ruleset = RULESETS.HOUSE
} = {}) {
  let count = 0;
  let lastSquare = null;

  for (let i = 0; i < board.length; i++) {
    if (Array.isArray(board[i])) {
      count++;
      lastSquare = i;
    }
  }

  if (count === 1 && lastSquare !== null) {
    if (ruleset === RULESETS.GOFF && Array.isArray(board[lastSquare])) {
      board[lastSquare] =
        board[lastSquare].find(token => typeof token === "string" && token.startsWith(turn)) ??
        board[lastSquare].find(token => typeof token === "string") ??
        turn;
    } else {
      board[lastSquare] = turn;
    }
  }

  return board;
}

function isCollapsedCell(board, cell) {
  return !Array.isArray(board[cell]);
}

function isFullCell(board, cell) {
  return Array.isArray(board[cell]) && board[cell].every(value => value !== null);
}

function addQuantumSymbol(board, square, symbol) {
  const nextBoard = cloneBoard(board);

  for (let i = 0; i < INNER_BOARD_SIZE; i++) {
    if (nextBoard[square][i] === null) {
      nextBoard[square][i] = symbol;
      break;
    }
  }

  return nextBoard;
}

function buildLocalState(previousState, ruleset = getPreferredRuleset()) {
  const localName = getPlayerName();
  const opponentName =
    previousState?.players?.opponent?.name &&
    previousState.players.opponent.name !== "Searching..."
      ? previousState.players.opponent.name
      : "Player O";

  const initialBoard = createBoard();

  return {
    session: {
      roomId: "local",
      roomReady: true,
      status: "starting",
      host: true,
      type: "local",
      ruleset,
      countdownEndsAt: Date.now() + MATCH_START_DELAY_MS,
      role: "player",
      playerMark: "X"
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
    game: {
      board: initialBoard,
      cyclePath: null,
      collapseChoices: null,
      turn: "X",
      winner: null,
      winningLine: null,
      nextAction: "move"
    },
    boardHistory: [cloneBoard(initialBoard)]
  };
}

export function createLocalGameController() {
  const runtime = {
    moves: [],
    symbolIndex: new Map(),
    startTimeout: null
  };

  function clearTimer() {
    const timerId = getState().timeInterval;
    if (timerId) {
      clearInterval(timerId);
      setTimeInterval(null);
    }
  }

  function clearStartTimeout() {
    if (runtime.startTimeout) {
      clearTimeout(runtime.startTimeout);
      runtime.startTimeout = null;
    }
  }

  function finishOnTimeLosss(expiredMark) {
    const currentState = getState();
    const winner = expiredMark === "X" ? "O" : "X";

    setState({
      ...currentState,
      session: {
        ...currentState.session,
        status: "finished"
      },
      game: {
        ...currentState.game,
        winner,
        nextAction: "winner",
        cyclePath: null
      }
    });

    clearTimer();
  }

  function ensureTimer() {
    clearTimer();

    const timerId = setInterval(() => {
      const liveState = getState();
      if (liveState.session.type !== "local" || liveState.session.status !== "playing") {
        clearTimer();
        return;
      }

      const targetKey = liveState.game.turn === "X" ? "me" : "opponent";
      const currentTime = liveState.players[targetKey].time;
      const nextTime = Math.max(0, currentTime - 1);

      setState({
        ...liveState,
        players: {
          ...liveState.players,
          [targetKey]: {
            ...liveState.players[targetKey],
            time: nextTime
          }
        }
      });

      if (nextTime === 0) {
        finishOnTimeLosss(liveState.game.turn);
      }
    }, 1000);

    setTimeInterval(timerId);
  }

  function publish(nextState) {
    setState({ ...nextState, timeInterval: getState().timeInterval });
    if (nextState.session.status === "playing") {
      ensureTimer();
    } else {
      clearTimer();
    }
  }

  function startMatch() {
    runtime.moves = [];
    runtime.symbolIndex = new Map();
    clearStartTimeout();
    clearTimer();

    const currentState = getState();
    const ruleset = currentState.session.type === "local"
      ? currentState.session.ruleset ?? getPreferredRuleset()
      : getPreferredRuleset();
    const nextState = buildLocalState(currentState, ruleset);
    setState(nextState);
    runtime.startTimeout = setTimeout(() => {
      runtime.startTimeout = null;
      const liveState = getState();
      if (liveState.session.type !== "local") return;

      setState({
        ...liveState,
        session: {
          ...liveState.session,
          status: "playing",
          countdownEndsAt: null
        }
      });
      ensureTimer();
    }, MATCH_START_DELAY_MS);
  }

  function handleMove(state, cellIndex) {
    if (state.session.status !== "playing" || state.game.nextAction !== "move") {
      return "LOCKED";
    }

    const moves = runtime.moves;

    if (moves.length % 2 !== 0 && cellIndex === moves[moves.length - 1].square) {
      return "LOCKED";
    }

    if (isCollapsedCell(state.game.board, cellIndex) || isFullCell(state.game.board, cellIndex)) {
      return "LOCKED";
    }

    const mark = state.game.turn;
    const isFirstHalf = moves.length % 2 === 0;
    const symbolNumber = Math.floor(moves.length / 2) + 1;
    const symbol = `${mark}${symbolNumber}`;

    runtime.moves.push({ square: cellIndex, symbol });

    const board = addQuantumSymbol(state.game.board, cellIndex, symbol);
    const boardHistory = [...cloneBoardHistory(state.boardHistory), cloneBoard(board)];

    if (isFirstHalf) {
      runtime.symbolIndex.set(symbol, [cellIndex]);

      publish({
        ...state,
        game: {
          ...state.game,
          board,
          nextAction: "move"
        },
        boardHistory
      });

      return "MOVE";
    }

    const existingSquares = runtime.symbolIndex.get(symbol) ?? [];
    existingSquares.push(cellIndex);
    runtime.symbolIndex.set(symbol, existingSquares);

    const previousMove = runtime.moves[runtime.moves.length - 2];
    const cycleResult = checkForCycle(runtime.moves, cellIndex, previousMove.square, symbol);
    const nextTurn = mark === "X" ? "O" : "X";
    const ruleset = state.session.ruleset ?? RULESETS.HOUSE;
    const collapseChoices = cycleResult.cycleFound
      ? ruleset === RULESETS.GOFF
        ? existingSquares.map(choiceSquare => [choiceSquare, symbol])
        : Array.from(new Map(cycleResult.cyclePath.map(([square, choiceSymbol]) => [
            `${square}:${choiceSymbol}`,
            [square, choiceSymbol]
          ])).values())
      : null;

    publish({
      ...state,
      game: {
        ...state.game,
        board,
        turn: nextTurn,
        cyclePath: cycleResult.cycleFound ? cycleResult.cyclePath : null,
        collapseChoices,
        nextAction: cycleResult.cycleFound ? "collapse" : "move"
      },
      boardHistory
    });

    return "MOVE";
  }

  function handleCollapse(state, cellIndex, symbol) {
    if (state.session.status !== "playing" || state.game.nextAction !== "collapse") {
      return "LOCKED";
    }

    if (!Array.isArray(state.game.cyclePath)) {
      return "LOCKED";
    }

    const collapseChoices = Array.isArray(state.game.collapseChoices)
      ? state.game.collapseChoices
      : [];
    if (!collapseChoices.some(([square, choiceSymbol]) => square === cellIndex && choiceSymbol === symbol)) {
      return "LOCKED";
    }

    const collapsedBoard = collapseEntanglement(
      runtime.symbolIndex,
      cloneBoard(state.game.board),
      cellIndex,
      symbol,
      { ruleset: state.session.ruleset ?? RULESETS.HOUSE }
    );

    const finalBoard = checkIfOneSquareRemains(collapsedBoard, state.game.turn, {
      ruleset: state.session.ruleset ?? RULESETS.HOUSE
    });
    const winnerResult = checkWinner(finalBoard, {
      ruleset: state.session.ruleset ?? RULESETS.HOUSE
    });
    const boardHistory = [...cloneBoardHistory(state.boardHistory), cloneBoard(finalBoard)];

    let winner = null;
    if (winnerResult.winningLines.length) {
      winner = winnerResult.resolvedWinner ?? "draw";
    }

    publish({
      ...state,
      session: {
        ...state.session,
        status: winner ? "finished" : "playing"
      },
      game: {
        ...state.game,
        board: finalBoard,
        cyclePath: null,
        collapseChoices: null,
        winner,
        winningLine: winner ? winnerResult.winningCombos : null,
        nextAction: winner ? "winner" : "move"
      },
      boardHistory
    });

    return "COLLAPSE";
  }

  function handleAction(state, action) {
    if (action.type === "BOARD_CELL_CLICK") {
      return handleMove(state, action.cellIndex);
    }

    if (action.type === "COLLAPSE_SYMBOL_CLICK") {
      return handleCollapse(state, action.cellIndex, action.symbol);
    }

    return "LOCKED";
  }

  return {
    startMatch,
    restart: startMatch,
    rematch: startMatch,
    handleAction,
    stop() {
      clearStartTimeout();
      clearTimer();
    }
  };
}
