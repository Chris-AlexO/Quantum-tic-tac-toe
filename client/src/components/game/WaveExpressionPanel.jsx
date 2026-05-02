import {
  buildTwinSquaresBySymbol,
  getCycleSymbolsForSquares,
  normalizeBoard
} from "./board/boardModel.js";

const MAX_VISIBLE_TERMS = 8;

export function WaveExpressionPanel({ board, cyclePath, previewSymbols }) {
  const expression = buildWaveTerms(board, cyclePath);

  return (
    <section className="wave-expression-panel">
      <code className="wave-expression-value">
        <span className="wave-expression-symbol">|ψ⟩ = </span>
        {expression.terms.length ? (
          expression.terms.map((term, index) => (
            <span key={`${term.text}-${index}`}>
              {index > 0 ? <span className="wave-expression-operator"> ⊗ </span> : null}
              <span className={termClassName(term, previewSymbols)}>
                {term.text}
              </span>
            </span>
          ))
        ) : (
          <span className="wave-expression-empty">|∅⟩</span>
        )}
        {expression.hiddenCount > 0 ? (
          <span className="wave-expression-more"> ⊗ ... ({expression.hiddenCount} more)</span>
        ) : null}
      </code>
    </section>
  );
}

function buildWaveTerms(board, cyclePath) {
  if (!Array.isArray(board)) {
    return { terms: [], hiddenCount: 0 };
  }

  const normalizedBoard = normalizeBoard(board);
  const cycleSquares = new Set(
    Array.isArray(cyclePath) ? cyclePath.map(([square]) => square) : []
  );
  const cycleSymbols = getCycleSymbolsForSquares(
    buildTwinSquaresBySymbol(normalizedBoard),
    cycleSquares
  );
  const fixedTerms = [];
  const quantumTermsByToken = new Map();

  normalizedBoard.forEach((cell, cellIndex) => {
    const square = cellIndex + 1;

    if (typeof cell === "string") {
      fixedTerms.push({
        token: cell,
        mark: markOf(cell),
        isCycleActive: cycleSymbols.size > 0,
        isCycleSymbol: cycleSymbols.has(cell),
        text: `|${formatToken(cell)}@${square}⟩`
      });
      return;
    }

    if (!Array.isArray(cell)) return;

    for (const token of cell) {
      if (!token) continue;
      if (!quantumTermsByToken.has(token)) {
        quantumTermsByToken.set(token, new Set());
      }
      quantumTermsByToken.get(token).add(square);
    }
  });

  const terms = [
    ...[...quantumTermsByToken.entries()]
      .sort(compareTokenEntries)
      .map(entry => formatQuantumTerm(entry, cycleSymbols)),
    ...fixedTerms
  ];

  const visibleTerms = terms.slice(0, MAX_VISIBLE_TERMS);
  const hiddenCount = terms.length - visibleTerms.length;

  return { terms: visibleTerms, hiddenCount };
}

function formatQuantumTerm([token, squares], cycleSymbols) {
  const locations = [...squares].sort((a, b) => a - b);
  const mark = markOf(token);
  const isCycleSymbol = cycleSymbols.has(token);

  if (locations.length <= 1) {
    return {
      token,
      mark,
      isCycleActive: cycleSymbols.size > 0,
      isCycleSymbol,
      text: `${formatToken(token)}|${locations[0] ?? "?"}⟩`
    };
  }

  return {
    token,
    mark,
    isCycleActive: cycleSymbols.size > 0,
    isCycleSymbol,
    text: `${formatToken(token)}(${locations.map(location => `|${location}⟩`).join(" + ")}) / √2`
  };
}

function termClassName(term, previewSymbols) {
  const hasPreview = previewSymbols?.size > 0;
  const classes = [
    "wave-expression-term",
    `is-${term.mark.toLowerCase()}`
  ];

  if (hasPreview) {
    classes.push(previewSymbols.has(term.token) ? "is-preview" : "is-preview-rest");
  } else if (term.isCycleSymbol) {
    classes.push("is-cycle");
  } else if (term.isCycleActive) {
    classes.push("is-outside-cycle");
  }

  return classes.join(" ");
}

function compareTokenEntries([left], [right]) {
  const leftMove = Number(left.match(/\d+$/)?.[0] ?? 0);
  const rightMove = Number(right.match(/\d+$/)?.[0] ?? 0);
  return leftMove - rightMove || left.localeCompare(right);
}

function formatToken(token) {
  return String(token).replace(/\d+/g, digits => [...digits].map(toSubscript).join(""));
}

function markOf(token) {
  return String(token).startsWith("O") ? "O" : "X";
}

function toSubscript(digit) {
  return "₀₁₂₃₄₅₆₇₈₉"[Number(digit)] ?? digit;
}
