export function buildBoardState(svg, state, clickables, cellSize, options = {}) {
  const svgNS = "http://www.w3.org/2000/svg";
  const showCollapseChoices = options.showCollapseChoices ?? true;
  const collapseChooser = options.collapseChooser ?? false;
  const cycleEntries = Array.isArray(state.game.cyclePath) ? state.game.cyclePath : [];
  const cycleEntrySet = new Set(cycleEntries.map(([square, symbol]) => `${square}:${symbol}`));
  const cycleSquares = new Set(cycleEntries.map(([square]) => square));

  function cellGroup(i) {
    return svg.querySelector(`g[data-idx="${i}"]`);
  }

  function littleCellGroup(i) {
    return cellGroup(i)?.querySelectorAll("rect.board-little-cell-rect") ?? [];
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

    const t = document.createElementNS(svgNS, "text");
    t.classList.add("quantum-symbol");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("font-size", "23");
    t.setAttribute("font-family", "\"Avenir Next\", \"Segoe UI\", sans-serif");
    t.setAttribute("font-weight", "600");
    t.setAttribute("fill", token.startsWith("X") ? "#60a5fa" : "#fb923c");
    t.textContent = token;

    if (cycleEntrySet.has(`${cellIndex}:${token}`)) {
      t.classList.add("cycle-involved-symbol");
      t.classList.add(token.startsWith("X") ? "cycle-involved-symbol-x" : "cycle-involved-symbol-o");
      if (state.game.nextAction === "collapse") {
        t.classList.add("collapse-context-symbol");
      }
    }

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
      qLayer.querySelectorAll(".quantum-symbol, .choosing-symbol, .collapse-choice").forEach(t => t.remove());

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
    path.setAttribute("stroke", "#d946ef");
    path.setAttribute("stroke-width", "10");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-dasharray", "18 14");
    path.setAttribute("opacity", "0.88");
    path.setAttribute("class", "cycle-path-line");
    svg.appendChild(path);

    pth.forEach(([square, symbol]) => {
      void symbol;
      const cx = cellSize / 2 + (square % 3) * cellSize;
      const cy = cellSize / 2 + Math.floor(square / 3) * cellSize;

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", String(cellSize * 0.11));
      circle.setAttribute("fill", "rgba(15, 23, 42, 0.92)");
      circle.setAttribute("stroke", "#f0abfc");
      circle.setAttribute("stroke-width", "3");
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

      const squareChoices = Array.from(symbolMap.values());

      squareChoices.forEach((choiceSymbol, choiceIndex) => {
        const column = choiceIndex % 2;
        const row = Math.floor(choiceIndex / 2);
        const baseX = column === 0 ? cellSize * 0.16 : cellSize * 0.54;
        const baseY = cellSize * (0.72 + row * 0.16);
        const group = document.createElementNS(svgNS, "g");
        group.classList.add("collapse-choice");
        group.setAttribute(
          "transform",
          `translate(${baseX}, ${baseY})`
        );

        const pill = document.createElementNS(svgNS, "rect");
        pill.setAttribute("width", String(cellSize * 0.3));
        pill.setAttribute("height", String(cellSize * 0.14));
        pill.setAttribute("rx", String(cellSize * 0.05));
        pill.setAttribute("ry", String(cellSize * 0.05));
        pill.setAttribute("fill", "rgba(15, 23, 42, 0.96)");
        pill.setAttribute("stroke", "rgba(240, 171, 252, 0.82)");
        pill.setAttribute("stroke-width", "2");

        const text = document.createElementNS(svgNS, "text");
        text.classList.add("choosing-symbol");
        text.setAttribute("x", String(cellSize * 0.15));
        text.setAttribute("y", String(cellSize * 0.07));
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "16");
        text.setAttribute("font-family", "\"Avenir Next\", \"Segoe UI\", sans-serif");
        text.setAttribute("font-weight", "700");
        text.setAttribute("fill", "#fdf4ff");
        text.textContent = choiceSymbol;

        group.append(pill, text);

        if (collapseChooser) {
          group.style.cursor = "pointer";
          group.setAttribute("role", "button");
          group.setAttribute("tabindex", "0");

          clickables.push({
            type: "COLLAPSE_SYMBOL_CLICK",
            cellIndex: square,
            symbol: choiceSymbol,
            element: group
          });
        } else {
          group.classList.add("collapse-choice-disabled");
        }

        qLayer.appendChild(group);
      });
    }
  }

  updateBoard(state.game.board);

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
