import C from "./constants.js";

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
      if (i === currentIdx) continue;
      if (moves[i].square !== currentSquare) continue;

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

function collapseEntanglement(symbolIndex, board, square, playerSymbol) {
  const collapsedSymbols = new Set();

  const isClassical = (cell) => typeof cell === "string";
  const classicalOf = (quantumToken) => quantumToken.charAt(0);

  const stack = [{ currentSquare: square, currentSymbol: playerSymbol }];

  while (stack.length > 0) {
    const { currentSquare, currentSymbol } = stack.pop();

    if (isClassical(board[currentSquare])) continue;

    for (let j = 0; j < C.INNER_BOARD_SIZE; j++) {
      const symbol = board[currentSquare][j];
      if (symbol === null) continue;

      if (collapsedSymbols.has(symbol)) continue;
      if (symbol === currentSymbol) continue;

      const twinPair = symbolIndex.get(symbol);
      if (!twinPair) continue;

      const [firstTwinSquare, secondTwinSquare] = twinPair;
      const twinToCheck =
        firstTwinSquare === currentSquare ? secondTwinSquare : firstTwinSquare;

      stack.push({ currentSquare: twinToCheck, currentSymbol: symbol });
    }

    board[currentSquare] =
      currentSymbol.length > 1 ? classicalOf(currentSymbol) : currentSymbol;

    collapsedSymbols.add(currentSymbol);
  }

  return board;
}

function checkWinner(board) {
  const winningCombos = [];
  const winningLines = [];
  let isWinner = false;

  for (const win of C.WINNING_LINES) {
    const sq1 = board[win[0] - 1];
    const sq2 = board[win[1] - 1];
    const sq3 = board[win[2] - 1];

    if (
      typeof sq1 === "string" &&
      sq1 === sq2 &&
      sq2 === sq3
    ) {
      isWinner = true;
      winningCombos.push(win);
      winningLines.push(sq1.charAt(0));
    }
  }

  return {
    winner: isWinner,
    winningLines,
    winningCombos
  };
}

function updateBoard(board, square, symbol) {
  const newBoard = board.getBoardArray().map(cell =>
    Array.isArray(cell) ? [...cell] : cell
  );

  for (let i = 0; i < C.INNER_BOARD_SIZE; i++) {
    if (newBoard[square][i] === null) {
      newBoard[square][i] = symbol;
      break;
    }
  }

  return newBoard;
}

function checkIfOneSquareRemains(board, turn) {
  let count = 0;
  let lastSquare = null;

  for (let i = 0; i < board.length; i++) {
    if (Array.isArray(board[i])) {
      count++;
      lastSquare = i;
    }
  }

  if (count === 1 && lastSquare !== null) {
    board[lastSquare] = turn;
  }

  return board;
}

function validateMove(game, cell, mark) {
  const moves = game.getMoves();

  if (
    moves.length % 2 !== 0 &&
    cell === moves[moves.length - 1].square
  ) {
    return {
      status: "error",
      message: "Can't place mark in same square twice!"
    };
  }

  const board = game.getBoard();

  if (board.isCollapsedCell(cell)) {
    return { status: "error", message: "Cell has already collapsed" };
  }

  if (board.isFullCell(cell)) {
    return { status: "error", message: "Cell full!" };
  }

  const turn = game.getTurn();

  if (turn !== mark) {
    return {
      status: "error",
      message: `Not player's ${mark} turn!`
    };
  }

  return { status: "ok" };
}

export {
  checkForCycle,
  collapseEntanglement,
  checkWinner,
  updateBoard,
  checkIfOneSquareRemains,
  validateMove
};