import { CELL_SIZE, joinClasses } from "./boardModel.js";

export function EntanglementLines({ lines, previewLineSymbols }) {
  return (
    <g className="quantum-entanglement-layer">
      {lines.map(line => (
        <path
          key={line.key}
          d={line.d}
          fill="none"
          data-symbol={line.symbol}
          className={joinClasses(
            line.className,
            previewLineSymbols.has(line.symbol) ? "collapse-preview-line" : ""
          )}
        />
      ))}
    </g>
  );
}

export function CyclePath({ cyclePath }) {
  if (!cyclePath) {
    return null;
  }

  return (
    <g>
      <polyline
        points={cyclePath.points}
        fill="none"
        stroke="#f4f0f4ff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="18 14"
        opacity="0.88"
        className="cycle-path-line"
      />
      {cyclePath.nodes.map(node => (
        <circle
          key={node.key}
          cx={node.cx}
          cy={node.cy}
          r={CELL_SIZE * 0.11}
          fill="rgba(15, 23, 42, 0.92)"
          stroke="#f2ebf4ff"
          strokeWidth="1"
          className="cycle-path-node"
        />
      ))}
    </g>
  );
}

export function WinningLines({ lines }) {
  return lines.map(line => (
    <g key={line.key}>
      <polyline
        points={line.points}
        fill="none"
        className="winning-line-glow"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={line.points}
        fill="none"
        className="winning-line-core"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  ));
}
