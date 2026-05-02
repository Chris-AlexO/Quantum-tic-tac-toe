import { joinClasses } from "./boardModel.js";

export function QuantumSymbol({
  activePreview,
  previewSymbolKeys,
  symbol,
  onChoiceClick,
  onChoiceHover,
  onChoiceLeave
}) {
  const isPreviewSymbol = previewSymbolKeys.has(symbol.key);
  const isOriginSymbol = activePreview?.originKey === symbol.key;
  const isX = symbol.token.startsWith("X");
  const textClassName = getSymbolTextClasses({
    activePreview,
    isOriginSymbol,
    isPreviewSymbol,
    symbol
  });
  const orbitalClassName = joinClasses(
    "quantum-orbital",
    isPreviewSymbol ? "collapse-preview-orbital" : "",
    isOriginSymbol ? "collapse-preview-origin-orbital" : ""
  );

  return (
    <g>
      <g className={orbitalClassName} data-symbol={symbol.token} data-cell-index={symbol.cellIndex}>
        <circle
          className={`quantum-core ${isX ? "quantum-core-x" : "quantum-core-o"}`}
          cx={symbol.x}
          cy={symbol.y}
          r="8.5"
        />
        <ellipse
          className={`quantum-orbit ${isX ? "quantum-orbit-x" : "quantum-orbit-o"}`}
          cx={symbol.x}
          cy={symbol.y}
          rx="16"
          ry="8"
        />
        <ellipse
          className={`quantum-orbit ${isX ? "quantum-orbit-x" : "quantum-orbit-o"}`}
          cx={symbol.x}
          cy={symbol.y}
          rx="16"
          ry="8"
          transform={`rotate(58 ${symbol.x} ${symbol.y})`}
        />
      </g>
      <text
        x={symbol.x}
        y={symbol.y}
        fontSize="23"
        fontFamily={'"Avenir Next", "Segoe UI", sans-serif'}
        fontWeight="600"
        fill={symbol.fill}
        data-symbol={symbol.token}
        data-cell-index={symbol.cellIndex}
        className={textClassName}
        role={symbol.isCollapseChoice ? "button" : undefined}
        aria-label={
          symbol.isCollapseChoice
            ? `Collapse ${symbol.token} in cell ${symbol.cellIndex + 1}`
            : undefined
        }
        tabIndex={symbol.isCollapseChoice ? 0 : undefined}
        onMouseEnter={() => {
          if (symbol.isCollapseChoice) {
            onChoiceHover(symbol.key);
          }
        }}
        onMouseLeave={() => {
          if (symbol.isCollapseChoice) {
            onChoiceLeave();
          }
        }}
        onClick={
          symbol.isCollapseChoice
            ? event => void onChoiceClick(event, symbol.cellIndex, symbol.token)
            : undefined
        }
        onKeyDown={event => {
          if (!symbol.isCollapseChoice) {
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void onChoiceClick(event, symbol.cellIndex, symbol.token);
          }
        }}
      >
        {symbol.token}
      </text>
    </g>
  );
}

function getSymbolTextClasses({ activePreview, isOriginSymbol, isPreviewSymbol, symbol }) {
  const isChoice = symbol.textClasses.includes("collapse-choice-symbol");

  return joinClasses(
    symbol.textClasses,
    isPreviewSymbol ? "collapse-preview-symbol" : "",
    isPreviewSymbol && symbol.isCollapseChoice ? "collapse-preview-choice-symbol" : "",
    isPreviewSymbol && !symbol.isCollapseChoice ? "collapse-preview-auto-symbol" : "",
    isOriginSymbol ? "collapse-preview-origin-symbol" : "",
    activePreview && !isPreviewSymbol && isChoice ? "collapse-rest-choice-symbol" : "",
    activePreview && !isPreviewSymbol && !isChoice ? "collapse-rest-symbol" : ""
  );
}
