export function buildBoardState(svg, state, clickables, cellSize, options = {}) {
  const svgNS = "http://www.w3.org/2000/svg";
  const showCollapseChoices = options.showCollapseChoices ?? true;
  const collapseChooser = options.collapseChooser ?? false;
  const board = normalizeBoard(state?.game?.board);
  const cycleEntries = Array.isArray(state.game.cyclePath) ? state.game.cyclePath : [];
  const cycleSquares = new Set(cycleEntries.map(([square]) => square));
  const twinSquaresBySymbol = buildTwinSquaresBySymbol(board);
  const cycleSymbols = getCycleSymbolsForSquares(twinSquaresBySymbol, cycleSquares);
  const collapseChoiceKeys = new Set(
    Array.isArray(state.game.collapseChoices)
      ? state.game.collapseChoices.map(([square, symbol]) => `${square}:${symbol}`)
      : []
  );
  const symbolPlacements = new Map();
  const collapsePreviewByChoice = buildCollapsePreviewByChoice(
    board,
    twinSquaresBySymbol,
    state.game.collapseChoices ?? state.game.cyclePath,
    state.session.ruleset
  );
  const entanglementLayer = document.createElementNS(svgNS, "g");
  entanglementLayer.setAttribute("class", "quantum-entanglement-layer");
  svg.appendChild(entanglementLayer);

  function cellGroup(i) {
    return svg.querySelector(`g[data-idx="${i}"]`);
  }

  function addClassic(cellIndex, player) {
    const g = cellGroup(cellIndex);
    if (!g) return;

    const big = g.querySelector(".classic-text");
    if (!big) return;

    const rect = g.querySelector(".board-background-rect") || g.querySelector("rect");
    if (rect) {
      rect.classList.add(player.startsWith("X") ? "board-collapsed-x" : "board-collapsed-o");
    }

    big.classList.add(player.startsWith("X") ? "board-classic-x" : "board-classic-o");
    big.classList.toggle("classic-token", player.length > 1);
    big.textContent = player;
  }

  function addQuantum(cellIndex, smallCellIndex, token) {
    const g = cellGroup(cellIndex);
    if (!g) return;

    const qLayer = g.querySelector(".q-layer-group");
    if (!qLayer) return;

    const x = cellSize / 6 + (smallCellIndex % 3) * (cellSize / 3);
    const y = cellSize / 6 + Math.floor(smallCellIndex / 3) * (cellSize / 3);
    const orbital = buildQuantumOrbital(svgNS, x, y, token);
    orbital.dataset.cellIndex = String(cellIndex);

    const t = document.createElementNS(svgNS, "text");
    t.classList.add("quantum-symbol");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("font-size", "23");
    t.setAttribute("font-family", "\"Avenir Next\", \"Segoe UI\", sans-serif");
    t.setAttribute("font-weight", "600");
    t.setAttribute("fill", token.startsWith("X") ? "#60a5fa" : "#fb923c");
    t.dataset.symbol = token;
    t.dataset.cellIndex = String(cellIndex);
    t.textContent = token;
    registerSymbolPlacement(symbolPlacements, token, {
      square: cellIndex,
      x: x + (cellIndex % 3) * cellSize,
      y: y + Math.floor(cellIndex / 3) * cellSize
    });

    if (cycleSymbols.size) {
      if (cycleSymbols.has(token)) {
        t.classList.add("cycle-involved-symbol");
        t.classList.add(token.startsWith("X") ? "cycle-involved-symbol-x" : "cycle-involved-symbol-o");
        if (state.game.nextAction === "collapse") {
          t.classList.add("collapse-context-symbol");
          if (collapseChoiceKeys.has(`${cellIndex}:${token}`)) {
            t.classList.add("collapse-choice-symbol");
          } else {
            t.classList.add("collapse-passive-symbol");
          }

          if (collapseChooser && showCollapseChoices && collapseChoiceKeys.has(`${cellIndex}:${token}`)) {
            clickables.push({
              type: "COLLAPSE_SYMBOL_CLICK",
              cellIndex: cellIndex,
              symbol: token,
              element: t,
              hoverPreview: collapsePreviewByChoice.get(`${cellIndex}:${token}`) ?? null
            });
          }
        }
      } else {
        t.classList.add("cycle-not-involved-symbol");
        t.classList.add(token.startsWith("X") ? "cycle-not-involved-symbol-x" : "cycle-not-involved-symbol-o");
        if (state.game.nextAction === "collapse") {
          t.classList.add("collapse-outside-symbol");
        }
      }
    }

    qLayer.appendChild(orbital);
    qLayer.appendChild(t);
  }

  function updateBoard(board) {
    if (!Array.isArray(board)) return;

    for (let i = 0; i < board.length; i++) {
      const g = cellGroup(i);
      if (!g) continue;

      const qLayer = g.querySelector(".q-layer-group");
      if (!qLayer) continue;

      // Clear old quantum text on every render to avoid duplicates
      qLayer.querySelectorAll(
        ".quantum-symbol, .choosing-symbol, .collapse-choice, .quantum-orbital"
      ).forEach(t => t.remove());

      if (!Array.isArray(board[i])) {
        const rect = g.querySelector(".board-background-rect") || g.querySelector("rect");
        if (rect) {
          rect.classList.remove("board-cycle-highlight");
        }

        const littleRects = g.querySelectorAll("rect.board-little-cell-rect");
        littleRects.forEach(littleRect => littleRect.remove());

        addClassic(i, board[i]);
        continue;
      }

      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j]) {
          addQuantum(i, j, board[i][j]);
        }
      }

      const rect = g.querySelector(".board-background-rect") || g.querySelector("rect");
      if (rect) {
        if (cycleSquares.has(i)) {
          rect.classList.add("board-cycle-highlight");
        } else {
          rect.classList.remove("board-cycle-highlight");
        }
      }
    }
  }

  function showWin(wins) {
    if (!Array.isArray(wins)) return;

    for (const win of wins) {
      const points = win
        .map(p => {
          const x = cellSize / 2 + ((p - 1) % 3) * cellSize;
          const y = cellSize / 2 + Math.floor((p - 1) / 3) * cellSize;
          return `${x},${y}`;
        })
        .join(" ");

      const line = buildLine(points);
      svg.appendChild(line);
    }
  }

  function showCollapsePath(pth) {
    if (!Array.isArray(pth) || pth.length < 2) return;

    const points = pth
      .map(([square]) => {
        const x = cellSize / 2 + (square % 3) * cellSize;
        const y = cellSize / 2 + Math.floor(square / 3) * cellSize;
        return `${x},${y}`;
      })
      .join(" ");

    const path = document.createElementNS(svgNS, "polyline");
    path.setAttribute("points", points);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#f4f0f4ff");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-dasharray", "18 14");
    path.setAttribute("opacity", "0.88");
    path.setAttribute("class", "cycle-path-line");
    svg.appendChild(path);

    pth.forEach(([square, symbol]) => {
      const cx = cellSize / 2 + (square % 3) * cellSize;
      const cy = cellSize / 2 + Math.floor(square / 3) * cellSize;

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", String(cellSize * 0.11));
      circle.setAttribute("fill", "rgba(15, 23, 42, 0.92)");
      circle.setAttribute("stroke", "#f2ebf4ff");
      circle.setAttribute("stroke-width", "1");
      circle.setAttribute("class", "cycle-path-node");
      svg.appendChild(circle);
    });
  }

  function showCollapseSquares(choices) {
    if (!Array.isArray(choices)) return;

    const choicesBySquare = new Map();
    choices.forEach(([square, symbol]) => {
      const key = `${square}:${symbol}`;
      const existing = choicesBySquare.get(square) ?? new Map();
      existing.set(key, symbol);
      choicesBySquare.set(square, existing);
    });

    for (const [square, symbolMap] of choicesBySquare.entries()) {
      const g = cellGroup(square);
      if (!g) continue;

      const qLayer = g.querySelector(".q-layer-group");
      if (!qLayer) continue;

      qLayer.querySelectorAll(".collapse-choice").forEach(t => t.remove());

      const rect = g.querySelector(".board-background-rect") || g.querySelector("rect");
      if (rect) {
        rect.classList.add("board-collapse-target");
      }
    }
  }

  updateBoard(board);
  drawEntanglementLines();

  if (state.game.nextAction === "collapse") {
    showCollapsePath(state.game.cyclePath);
  }

  if (state.game.nextAction === "collapse" && showCollapseChoices) {
    showCollapseSquares(state.game.collapseChoices ?? state.game.cyclePath);
  }

  if (state.game.nextAction === "winner") {
    showWin(state.game.winningLine);
  }

  return { svg, clickables };

  function drawEntanglementLines() {
    for (const [symbol, placements] of symbolPlacements.entries()) {
      if (!Array.isArray(placements) || placements.length !== 2) {
        continue;
      }

      const [start, end] = placements;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", buildEntanglementPath(start, end));
      path.setAttribute("fill", "none");
      path.setAttribute("class", [
        "quantum-entanglement-line",
        symbol.startsWith("X")
          ? "quantum-entanglement-line-x"
          : "quantum-entanglement-line-o",
        cycleSymbols.has(symbol) ? "cycle-entanglement-line" : ""
      ].filter(Boolean).join(" "));
      path.dataset.symbol = symbol;
      entanglementLayer.appendChild(path);
    }
  }
}

function normalizeBoard(board) {
  if (Array.isArray(board) && board.length === 9) {
    return board;
  }

  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
}

function buildLine(points) {
  const svgNS = "http://www.w3.org/2000/svg";
  const group = document.createElementNS(svgNS, "g");

  const glow = document.createElementNS(svgNS, "polyline");
  glow.setAttribute("points", points);
  glow.setAttribute("fill", "none");
  glow.setAttribute("class", "winning-line-glow");
  glow.setAttribute("stroke-linecap", "round");
  glow.setAttribute("stroke-linejoin", "round");

  const core = document.createElementNS(svgNS, "polyline");
  core.setAttribute("points", points);
  core.setAttribute("fill", "none");
  core.setAttribute("class", "winning-line-core");
  core.setAttribute("stroke-linecap", "round");
  core.setAttribute("stroke-linejoin", "round");

  group.append(glow, core);
  return group;
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

function buildTwinSquaresBySymbol(board) {
  const twinSquaresBySymbol = new Map();

  if (!Array.isArray(board)) {
    return twinSquaresBySymbol;
  }

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

function getCycleSymbolsForSquares(twinSquaresBySymbol, cycleSquares) {
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

function buildCollapsePreview(board, twinSquaresBySymbol, square, symbol) {
  const visitedSymbols = new Set();
  const resolvedEntries = [];
  const stack = [{ square, symbol, isOrigin: true }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current?.symbol || visitedSymbols.has(current.symbol)) {
      continue;
    }

    visitedSymbols.add(current.symbol);
    resolvedEntries.push(current);

    const cell = board[current.square];
    if (!Array.isArray(cell)) {
      continue;
    }

    cell.forEach(cellSymbol => {
      if (!cellSymbol || cellSymbol === current.symbol || visitedSymbols.has(cellSymbol)) {
        return;
      }

      const twinSquares = twinSquaresBySymbol.get(cellSymbol);
      if (!Array.isArray(twinSquares)) {
        return;
      }

      const twinSquare = twinSquares.find(candidateSquare => candidateSquare !== current.square);
      if (typeof twinSquare !== "number") {
        return;
      }

      stack.push({
        square: twinSquare,
        symbol: cellSymbol,
        isOrigin: false
      });
    });
  }

  return {
    originKey: `${square}:${symbol}`,
    symbolKeys: resolvedEntries.map(entry => `${entry.square}:${entry.symbol}`),
    lineSymbols: resolvedEntries.map(entry => entry.symbol)
  };
}

function registerSymbolPlacement(symbolPlacements, symbol, placement) {
  const placements = symbolPlacements.get(symbol) ?? [];
  placements.push(placement);
  symbolPlacements.set(symbol, placements);
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

function buildQuantumOrbital(svgNS, x, y, token) {
  const group = document.createElementNS(svgNS, "g");
  group.setAttribute("class", "quantum-orbital");
  group.dataset.symbol = token;

  const core = document.createElementNS(svgNS, "circle");
  core.setAttribute("cx", x);
  core.setAttribute("cy", y);
  core.setAttribute("r", "8.5");
  core.setAttribute(
    "class",
    `quantum-core ${token.startsWith("X") ? "quantum-core-x" : "quantum-core-o"}`
  );

  const orbitA = document.createElementNS(svgNS, "ellipse");
  orbitA.setAttribute("cx", x);
  orbitA.setAttribute("cy", y);
  orbitA.setAttribute("rx", "16");
  orbitA.setAttribute("ry", "8");
  orbitA.setAttribute(
    "class",
    `quantum-orbit ${token.startsWith("X") ? "quantum-orbit-x" : "quantum-orbit-o"}`
  );

  const orbitB = document.createElementNS(svgNS, "ellipse");
  orbitB.setAttribute("cx", x);
  orbitB.setAttribute("cy", y);
  orbitB.setAttribute("rx", "16");
  orbitB.setAttribute("ry", "8");
  orbitB.setAttribute(
    "class",
    `quantum-orbit ${token.startsWith("X") ? "quantum-orbit-x" : "quantum-orbit-o"}`
  );
  orbitB.setAttribute("transform", `rotate(58 ${x} ${y})`);

  group.append(core, orbitA, orbitB);
  return group;
}
