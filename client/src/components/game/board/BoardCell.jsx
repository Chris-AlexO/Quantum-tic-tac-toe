import { CELL_SIZE } from "./boardModel.js";
import { QuantumSymbol } from "./QuantumSymbol.jsx";

export function BoardCell({
  activePreview,
  cell,
  previewSymbolKeys,
  onCellClick,
  onChoiceClick,
  onChoiceHover,
  onChoiceLeave
}) {
  return (
    <g
      className="board-cell"
      data-idx={cell.cellIndex}
      transform={cell.transform}
      tabIndex={0}
      role="button"
      aria-label={`Cell ${cell.cellIndex + 1}${cell.classicToken ? ` collapsed as ${cell.classicToken}` : ""}`}
      width={CELL_SIZE}
      height={CELL_SIZE}
      onClick={() => void onCellClick(cell.cellIndex)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void onCellClick(cell.cellIndex);
        }
      }}
    >
      <rect
        className={cell.backgroundClasses.join(" ")}
        x="0"
        y="0"
        width={CELL_SIZE}
        height={CELL_SIZE}
        rx={CELL_SIZE * 0.1}
        ry={CELL_SIZE * 0.1}
        strokeWidth={CELL_SIZE * 0.02}
      />

      {cell.smallCells.map(smallCell => (
        <SmallCell key={smallCell.key} cellIndex={cell.cellIndex} smallCell={smallCell} />
      ))}

      <g className="q-layer-group">
        {cell.quantumSymbols.map(symbol => (
          <QuantumSymbol
            key={symbol.key}
            activePreview={activePreview}
            previewSymbolKeys={previewSymbolKeys}
            symbol={symbol}
            onChoiceClick={onChoiceClick}
            onChoiceHover={onChoiceHover}
            onChoiceLeave={onChoiceLeave}
          />
        ))}
      </g>

      <text x={CELL_SIZE / 2} y={CELL_SIZE / 2} textAnchor="middle" className={cell.classicClasses}>
        {cell.classicToken ?? ""}
      </text>
    </g>
  );
}

function SmallCell({ cellIndex, smallCell }) {
  return (
    <rect
      className="board-little-cell-rect"
      data-idx={cellIndex}
      data-sidx={smallCell.smallCellIndex}
      width={CELL_SIZE / 3}
      height={CELL_SIZE / 3}
      rx={CELL_SIZE * 0.025}
      ry={CELL_SIZE * 0.025}
      transform={`translate(${smallCell.x}, ${smallCell.y})`}
      strokeWidth={CELL_SIZE * 0.01}
    />
  );
}
