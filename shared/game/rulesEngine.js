export const BOARD_SIZE = 9;
export const INNER_BOARD_SIZE = 9;
export const WINNING_LINES = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
  [1, 5, 9],
  [3, 5, 7]
];

export const TURN_SECONDS = 600;
export const MATCH_START_DELAY_MS = 3000;
export const RULESETS = {
  HOUSE: "house",
  GOFF: "goff"
};

function classicalMarkOf(token) {
  return typeof token === "string" ? token.charAt(0) : null;
}

function subscriptOf(token) {
  if (typeof token !== "string") {
    return 0;
  }

  const match = token.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function classicalizeToken(token, ruleset = RULESETS.HOUSE) {
  return ruleset === RULESETS.GOFF ? token : classicalMarkOf(token);
}

function getTwinIndex(index) {
  return index % 2 === 0 ? index + 1 : index - 1;
}

export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: INNER_BOARD_SIZE }, () => null)
  );
}

export function cloneBoard(board) {
  return board.map(cell => (Array.isArray(cell) ? [...cell] : cell));
}

export function cloneBoardHistory(boardHistory) {
  return boardHistory.map(board => cloneBoard(board));
}

export function isCollapsedCell(board, cell) {
  return !Array.isArray(board[cell]);
}

export function isFullCell(board, cell) {
  return Array.isArray(board[cell]) && board[cell].every(value => value !== null);
}

export function addQuantumSymbol(board, square, symbol) {
  const nextBoard = cloneBoard(board);

  for (let index = 0; index < INNER_BOARD_SIZE; index += 1) {
    if (nextBoard[square][index] === null) {
      nextBoard[square][index] = symbol;
      break;
    }
  }

  return nextBoard;
}

export function updateBoard(boardLike, square, symbol) {
  const board = typeof boardLike?.getBoardArray === "function"
    ? boardLike.getBoardArray()
    : boardLike;

  return addQuantumSymbol(board, square, symbol);
}

export function validateMove(game, cell, mark) {
  const moves = game.getMoves();

  if (moves.length % 2 !== 0 && cell === moves[moves.length - 1].square) {
    return {
      status: "error",
      message: "Can't place mark in same square twice!"
    };
  }

  const board = game.getBoard();
  const boardArray = typeof board.getBoardArray === "function"
    ? board.getBoardArray()
    : board;

  const cellIsCollapsed = typeof board.isCollapsedCell === "function"
    ? board.isCollapsedCell(cell)
    : isCollapsedCell(boardArray, cell);
  if (cellIsCollapsed) {
    return { status: "error", message: "Cell has already collapsed" };
  }

  const cellIsFull = typeof board.isFullCell === "function"
    ? board.isFullCell(cell)
    : isFullCell(boardArray, cell);
  if (cellIsFull) {
    return { status: "error", message: "Cell full!" };
  }

  if (game.getTurn() !== mark) {
    return {
      status: "error",
      message: `Not player's ${mark} turn!`
    };
  }

  return { status: "ok" };
}

export function checkForCycle(moves, bigSquare, bigSquareOfTwin, symbol) {
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

    for (let index = 0; index < moves.length; index += 1) {
      if (index === currentIdx || moves[index].square !== currentSquare) {
        continue;
      }

      const edgeKey = `${currentIdx}->${index}`;
      if (visitedEdges.has(edgeKey)) {
        continue;
      }
      visitedEdges.add(edgeKey);

      const moveSymbol = moves[index].symbol;
      const twinIdx = getTwinIndex(index);

      if (twinIdx < 0 || twinIdx >= moves.length) {
        continue;
      }

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

export function collapseEntanglement(
  symbolIndex,
  board,
  square,
  playerSymbol,
  { ruleset = RULESETS.HOUSE } = {}
) {
  const collapsedSymbols = new Set();
  const stack = [{ currentSquare: square, currentSymbol: playerSymbol }];

  while (stack.length > 0) {
    const { currentSquare, currentSymbol } = stack.pop();

    if (typeof board[currentSquare] === "string") {
      continue;
    }

    for (let index = 0; index < INNER_BOARD_SIZE; index += 1) {
      const symbol = board[currentSquare][index];
      if (symbol === null || collapsedSymbols.has(symbol) || symbol === currentSymbol) {
        continue;
      }

      const twinPair = symbolIndex.get(symbol);
      if (!twinPair) {
        continue;
      }

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

export function buildCollapseChoices(board, cyclePath, ruleset, fallbackChoices) {
  if (!Array.isArray(cyclePath)) {
    return null;
  }

  if (ruleset === RULESETS.GOFF) {
    return fallbackChoices;
  }

  const cycleSquares = new Set(cyclePath.map(([square]) => square));
  const twinSquaresBySymbol = buildTwinSquaresBySymbol(board);
  const collapseChoices = [];

  twinSquaresBySymbol.forEach((squares, symbol) => {
    if (
      Array.isArray(squares) &&
      squares.length === 2 &&
      squares.every(square => cycleSquares.has(square))
    ) {
      squares.forEach(square => {
        collapseChoices.push([square, symbol]);
      });
    }
  });

  return collapseChoices;
}

export function checkWinner(board, { ruleset = RULESETS.HOUSE } = {}) {
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

export function checkIfOneSquareRemains(board, turn, { ruleset = RULESETS.HOUSE } = {}) {
  let count = 0;
  let lastSquare = null;

  for (let index = 0; index < board.length; index += 1) {
    if (Array.isArray(board[index])) {
      count += 1;
      lastSquare = index;
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

function buildTwinSquaresBySymbol(board) {
  const twinSquaresBySymbol = new Map();

  board.forEach((cell, square) => {
    if (!Array.isArray(cell)) {
      return;
    }

    cell.forEach(symbol => {
      if (!symbol) {
        return;
      }

      const squares = twinSquaresBySymbol.get(symbol) ?? [];
      squares.push(square);
      twinSquaresBySymbol.set(symbol, squares);
    });
  });

  return twinSquaresBySymbol;
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
