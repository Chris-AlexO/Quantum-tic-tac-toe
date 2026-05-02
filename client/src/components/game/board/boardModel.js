export const CELL_SIZE = 200;
export const SVG_SIZE = CELL_SIZE * 3;

export function buildBoardViewModel(state, options = {}) {
  const showCollapseChoices = options.showCollapseChoices ?? true;
  const collapseChooser = options.collapseChooser ?? false;
  const board = normalizeBoard(state?.game?.board);
  const cycleEntries = Array.isArray(state?.game?.cyclePath) ? state.game.cyclePath : [];
  const cycleSquares = new Set(cycleEntries.map(([square]) => square));
  const twinSquaresBySymbol = buildTwinSquaresBySymbol(board);
  const cycleSymbols = getCycleSymbolsForSquares(twinSquaresBySymbol, cycleSquares);
  const collapseChoices = Array.isArray(state?.game?.collapseChoices)
    ? state.game.collapseChoices
    : [];
  const collapseChoiceKeys = new Set(collapseChoices.map(([square, symbol]) => `${square}:${symbol}`));
  const collapseTargetSquares = new Set(showCollapseChoices ? collapseChoices.map(([square]) => square) : []);
  const { cells, symbolPlacements } = buildBoardCells({
    board,
    state,
    cycleSquares,
    cycleSymbols,
    collapseChoiceKeys,
    collapseTargetSquares,
    collapseChooser,
    showCollapseChoices
  });

  return {
    cells,
    entanglementLines: buildEntanglementLines(symbolPlacements, cycleSymbols),
    cyclePath: buildCyclePath(state, cycleEntries),
    winningLines: buildWinningLines(state),
    collapsePreviewByChoice: buildCollapsePreviewByChoice(
      board,
      twinSquaresBySymbol,
      state?.game?.collapseChoices ?? state?.game?.cyclePath,
      state?.session?.ruleset
    )
  };
}

export function areBoardStagePropsEqual(prevProps, nextProps) {
  return (
    prevProps.dispatch === nextProps.dispatch &&
    prevProps.onPreviewSymbolsChange === nextProps.onPreviewSymbolsChange &&
    prevProps.historyMode === nextProps.historyMode &&
    prevProps.showCollapseChoices === nextProps.showCollapseChoices &&
    prevProps.collapseChooser === nextProps.collapseChooser &&
    equalBoardRenderState(prevProps.displayState, nextProps.displayState)
  );
}

export function normalizeBoard(board) {
  if (Array.isArray(board) && board.length === 9) {
    return board;
  }

  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
}

export function buildTwinSquaresBySymbol(board) {
  const twinSquaresBySymbol = new Map();

  board.forEach((cell, square) => {
    if (!Array.isArray(cell)) return;

    cell.forEach(symbol => {
      if (!symbol) return;

      const squares = twinSquaresBySymbol.get(symbol) ?? [];
      squares.push(square);
      twinSquaresBySymbol.set(symbol, squares);
    });
  });

  return twinSquaresBySymbol;
}

export function getCycleSymbolsForSquares(twinSquaresBySymbol, cycleSquares) {
  const cycleSymbols = new Set();

  twinSquaresBySymbol.forEach((squares, symbol) => {
    if (
      Array.isArray(squares) &&
      squares.length === 2 &&
      squares.every(square => cycleSquares.has(square))
    ) {
      cycleSymbols.add(symbol);
    }
  });

  return cycleSymbols;
}

export function joinClasses(...values) {
  return values.flat().filter(Boolean).join(" ");
}

function buildBoardCells({
  board,
  state,
  cycleSquares,
  cycleSymbols,
  collapseChoiceKeys,
  collapseTargetSquares,
  collapseChooser,
  showCollapseChoices
}) {
  const symbolPlacements = new Map();
  const cells = board.map((cell, cellIndex) =>
    buildCellModel({
      cell,
      cellIndex,
      state,
      cycleSquares,
      cycleSymbols,
      collapseChoiceKeys,
      collapseTargetSquares,
      collapseChooser,
      showCollapseChoices,
      symbolPlacements
    })
  );

  return { cells, symbolPlacements };
}

function buildCellModel({
  cell,
  cellIndex,
  state,
  cycleSquares,
  cycleSymbols,
  collapseChoiceKeys,
  collapseTargetSquares,
  collapseChooser,
  showCollapseChoices,
  symbolPlacements
}) {
  const row = Math.floor(cellIndex / 3);
  const col = cellIndex % 3;
  const isClassic = !Array.isArray(cell);

  return {
    key: `cell-${cellIndex}`,
    cellIndex,
    transform: `translate(${col * CELL_SIZE}, ${row * CELL_SIZE})`,
    backgroundClasses: buildBackgroundClasses(cell, cellIndex, { cycleSquares, collapseTargetSquares }),
    classicToken: isClassic ? cell : null,
    classicClasses: isClassic ? getClassicClasses(cell) : "classic-text",
    smallCells: isClassic ? [] : buildSmallCells(cellIndex),
    quantumSymbols: isClassic
      ? []
      : buildQuantumSymbols(cell, {
          cellIndex,
          row,
          col,
          state,
          cycleSymbols,
          collapseChoiceKeys,
          collapseChooser,
          showCollapseChoices,
          symbolPlacements
        })
  };
}

function buildBackgroundClasses(cell, cellIndex, { cycleSquares, collapseTargetSquares }) {
  const classes = ["board-background-rect"];

  if (cycleSquares.has(cellIndex)) classes.push("board-cycle-highlight");
  if (collapseTargetSquares.has(cellIndex)) classes.push("board-collapse-target");
  if (typeof cell === "string") classes.push(cell.startsWith("X") ? "board-collapsed-x" : "board-collapsed-o");

  return classes;
}

function buildSmallCells(cellIndex) {
  return Array.from({ length: 9 }, (_, smallCellIndex) => ({
    key: `${cellIndex}:${smallCellIndex}`,
    smallCellIndex,
    x: (smallCellIndex % 3) * (CELL_SIZE / 3),
    y: Math.floor(smallCellIndex / 3) * (CELL_SIZE / 3)
  }));
}

function buildQuantumSymbols(
  cell,
  {
    cellIndex,
    row,
    col,
    state,
    cycleSymbols,
    collapseChoiceKeys,
    collapseChooser,
    showCollapseChoices,
    symbolPlacements
  }
) {
  return cell.flatMap((token, smallCellIndex) => {
    if (!token) return [];

    const x = CELL_SIZE / 6 + (smallCellIndex % 3) * (CELL_SIZE / 3);
    const y = CELL_SIZE / 6 + Math.floor(smallCellIndex / 3) * (CELL_SIZE / 3);
    const key = `${cellIndex}:${token}`;

    registerSymbolPlacement(symbolPlacements, token, {
      square: cellIndex,
      x: x + col * CELL_SIZE,
      y: y + row * CELL_SIZE
    });

    return {
      key,
      cellIndex,
      token,
      x,
      y,
      fill: token.startsWith("X") ? "#60a5fa" : "#fb923c",
      textClasses: buildSymbolClasses(token, {
        key,
        state,
        cycleSymbols,
        collapseChoiceKeys
      }),
      isCollapseChoice:
        state?.game?.nextAction === "collapse" &&
        collapseChoiceKeys.has(key) &&
        collapseChooser &&
        showCollapseChoices
    };
  });
}

function buildSymbolClasses(token, { key, state, cycleSymbols, collapseChoiceKeys }) {
  const classes = ["quantum-symbol"];

  if (!cycleSymbols.size) return classes;

  if (cycleSymbols.has(token)) {
    classes.push(
      "cycle-involved-symbol",
      token.startsWith("X") ? "cycle-involved-symbol-x" : "cycle-involved-symbol-o"
    );

    if (state?.game?.nextAction === "collapse") {
      classes.push("collapse-context-symbol");
      classes.push(collapseChoiceKeys.has(key) ? "collapse-choice-symbol" : "collapse-passive-symbol");
    }

    return classes;
  }

  classes.push(
    "cycle-not-involved-symbol",
    token.startsWith("X") ? "cycle-not-involved-symbol-x" : "cycle-not-involved-symbol-o"
  );

  if (state?.game?.nextAction === "collapse") {
    classes.push("collapse-outside-symbol");
  }

  return classes;
}

function buildEntanglementLines(symbolPlacements, cycleSymbols) {
  return Array.from(symbolPlacements.entries())
    .filter(([, placements]) => Array.isArray(placements) && placements.length === 2)
    .map(([symbol, placements]) => {
      const [start, end] = placements;

      return {
        key: `line-${symbol}`,
        symbol,
        d: buildEntanglementPath(start, end),
        className: joinClasses(
          "quantum-entanglement-line",
          symbol.startsWith("X") ? "quantum-entanglement-line-x" : "quantum-entanglement-line-o",
          cycleSymbols.has(symbol) ? "cycle-entanglement-line" : ""
        )
      };
    });
}

function buildCyclePath(state, cycleEntries) {
  return state?.game?.nextAction === "collapse" && cycleEntries.length >= 2
    ? {
        points: cycleEntries.map(([square]) => getCellCenterPoint(square)).join(" "),
        nodes: cycleEntries.map(([square, symbol]) => {
          const { x, y } = getCellCenter(square);
          return {
            key: `cycle-node-${square}:${symbol}`,
            cx: x,
            cy: y
          };
        })
      }
    : null;
}

function buildWinningLines(state) {
  return state?.game?.nextAction === "winner" && Array.isArray(state?.game?.winningLine)
    ? state.game.winningLine.map((line, index) => ({
        key: `winning-line-${index}`,
        points: line.map(position => getCellCenterPoint(position - 1)).join(" ")
      }))
    : [];
}

function buildCollapsePreviewByChoice(board, twinSquaresBySymbol, collapseChoices, ruleset) {
  if (ruleset !== "house" || !Array.isArray(collapseChoices)) {
    return new Map();
  }

  const previewByChoice = new Map();

  collapseChoices.forEach(([square, symbol]) => {
    previewByChoice.set(
      `${square}:${symbol}`,
      buildCollapsePreview(board, twinSquaresBySymbol, square, symbol)
    );
  });

  return previewByChoice;
}

function buildCollapsePreview(board, twinSquaresBySymbol, square, symbol) {
  const visitedSymbols = new Set();
  const resolvedEntries = [];
  const stack = [{ square, symbol }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current?.symbol || visitedSymbols.has(current.symbol)) continue;

    visitedSymbols.add(current.symbol);
    resolvedEntries.push(current);

    const cell = board[current.square];
    if (!Array.isArray(cell)) continue;

    cell.forEach(cellSymbol => {
      if (!cellSymbol || cellSymbol === current.symbol || visitedSymbols.has(cellSymbol)) return;

      const twinSquares = twinSquaresBySymbol.get(cellSymbol);
      if (!Array.isArray(twinSquares)) return;

      const twinSquare = twinSquares.find(candidateSquare => candidateSquare !== current.square);
      if (typeof twinSquare === "number") {
        stack.push({ square: twinSquare, symbol: cellSymbol });
      }
    });
  }

  return {
    originKey: `${square}:${symbol}`,
    symbolKeys: resolvedEntries.map(entry => `${entry.square}:${entry.symbol}`),
    lineSymbols: resolvedEntries.map(entry => entry.symbol)
  };
}

function equalBoardRenderState(prevState, nextState) {
  return (
    equalBoard(prevState?.game?.board, nextState?.game?.board) &&
    equalPairArray(prevState?.game?.cyclePath, nextState?.game?.cyclePath) &&
    equalPairArray(prevState?.game?.collapseChoices, nextState?.game?.collapseChoices) &&
    equalNestedNumberArray(prevState?.game?.winningLine, nextState?.game?.winningLine) &&
    (prevState?.game?.nextAction ?? null) === (nextState?.game?.nextAction ?? null) &&
    (prevState?.session?.ruleset ?? null) === (nextState?.session?.ruleset ?? null)
  );
}

function equalBoard(prevBoard, nextBoard) {
  const normalizedPrev = normalizeBoard(prevBoard);
  const normalizedNext = normalizeBoard(nextBoard);

  for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
    const prevCell = normalizedPrev[cellIndex];
    const nextCell = normalizedNext[cellIndex];

    if (Array.isArray(prevCell) !== Array.isArray(nextCell)) return false;

    if (!Array.isArray(prevCell) || !Array.isArray(nextCell)) {
      if ((prevCell ?? null) !== (nextCell ?? null)) return false;
      continue;
    }

    for (let symbolIndex = 0; symbolIndex < 9; symbolIndex += 1) {
      if ((prevCell[symbolIndex] ?? null) !== (nextCell[symbolIndex] ?? null)) return false;
    }
  }

  return true;
}

function equalPairArray(prevValue, nextValue) {
  if (prevValue === nextValue) return true;
  if (!Array.isArray(prevValue) && !Array.isArray(nextValue)) return true;
  if (!Array.isArray(prevValue) || !Array.isArray(nextValue) || prevValue.length !== nextValue.length) return false;

  return prevValue.every((entry, index) => {
    const nextEntry = nextValue[index];
    return (
      Array.isArray(entry) &&
      Array.isArray(nextEntry) &&
      entry[0] === nextEntry[0] &&
      entry[1] === nextEntry[1]
    );
  });
}

function equalNestedNumberArray(prevValue, nextValue) {
  if (prevValue === nextValue) return true;
  if (!Array.isArray(prevValue) && !Array.isArray(nextValue)) return true;
  if (!Array.isArray(prevValue) || !Array.isArray(nextValue) || prevValue.length !== nextValue.length) return false;

  return prevValue.every((entry, index) => {
    const nextEntry = nextValue[index];

    if (Array.isArray(entry) && Array.isArray(nextEntry)) {
      return (
        entry.length === nextEntry.length &&
        entry.every((value, valueIndex) => value === nextEntry[valueIndex])
      );
    }

    return entry === nextEntry;
  });
}

function getClassicClasses(cell) {
  return joinClasses(
    "classic-text",
    cell?.startsWith("X") ? "board-classic-x" : "board-classic-o",
    cell?.length > 1 ? "classic-token" : ""
  );
}

function getCellCenter(square) {
  return {
    x: CELL_SIZE / 2 + (square % 3) * CELL_SIZE,
    y: CELL_SIZE / 2 + Math.floor(square / 3) * CELL_SIZE
  };
}

function getCellCenterPoint(square) {
  const { x, y } = getCellCenter(square);
  return `${x},${y}`;
}

function buildEntanglementPath(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const curveDepth = Math.min(34, Math.max(16, distance * 0.11));
  const controlX = (start.x + end.x) / 2 + normalX * curveDepth;
  const controlY = (start.y + end.y) / 2 + normalY * curveDepth;

  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}

function registerSymbolPlacement(symbolPlacements, symbol, placement) {
  const placements = symbolPlacements.get(symbol) ?? [];
  placements.push(placement);
  symbolPlacements.set(symbol, placements);
}
