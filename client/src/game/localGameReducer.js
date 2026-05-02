import {
  addQuantumSymbol,
  buildCollapseChoices,
  checkForCycle,
  checkIfOneSquareRemains,
  checkWinner,
  cloneBoard,
  cloneBoardHistory,
  collapseEntanglement,
  isCollapsedCell,
  isFullCell,
  RULESETS
} from "../../../shared/game/localGameDomain.js";

export function handleLocalMove({ state, cellIndex, runtime, publish }) {
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

  moves.push({ square: cellIndex, symbol });

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

  const previousMove = moves[moves.length - 2];
  const cycleResult = checkForCycle(moves, cellIndex, previousMove.square, symbol);
  const nextTurn = mark === "X" ? "O" : "X";
  const ruleset = state.session.ruleset ?? RULESETS.HOUSE;
  const collapseChoices = cycleResult.cycleFound
    ? buildCollapseChoices(
        board,
        cycleResult.cyclePath,
        ruleset,
        existingSquares.map(choiceSquare => [choiceSquare, symbol])
      )
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

export function handleLocalCollapse({ state, cellIndex, symbol, runtime, publish }) {
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

  const ruleset = state.session.ruleset ?? RULESETS.HOUSE;
  const collapsedBoard = collapseEntanglement(
    runtime.symbolIndex,
    cloneBoard(state.game.board),
    cellIndex,
    symbol,
    { ruleset }
  );

  const finalBoard = checkIfOneSquareRemains(collapsedBoard, state.game.turn, { ruleset });
  const winnerResult = checkWinner(finalBoard, { ruleset });
  const boardHistory = [...cloneBoardHistory(state.boardHistory), cloneBoard(finalBoard)];

  const winner = winnerResult.winningLines.length
    ? winnerResult.resolvedWinner ?? "draw"
    : null;

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
