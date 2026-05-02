import { memo, useEffect, useMemo, useState } from "react";
import {
  areBoardStagePropsEqual,
  buildBoardViewModel,
  SVG_SIZE
} from "./board/boardModel.js";
import { BoardCell } from "./board/BoardCell.jsx";
import {
  CyclePath,
  EntanglementLines,
  WinningLines
} from "./board/BoardOverlays.jsx";
import { GAME_ACTIONS } from "../../../../shared/game/actions.js";

function BoardStageComponent({
  collapseChooser,
  dispatch,
  displayState,
  historyMode,
  onPreviewSymbolsChange,
  sessionStore,
  showCollapseChoices,
  stateRef
}) {
  const [hoveredChoiceKey, setHoveredChoiceKey] = useState(null);

  const viewModel = useMemo(
    () =>
      buildBoardViewModel(displayState, {
        showCollapseChoices,
        collapseChooser
      }),
    [displayState, showCollapseChoices, collapseChooser]
  );

  const activePreview = hoveredChoiceKey
    ? viewModel.collapsePreviewByChoice.get(hoveredChoiceKey) ?? null
    : null;
  const previewSymbolKeys = useMemo(
    () => new Set(activePreview?.symbolKeys ?? []),
    [activePreview]
  );
  const previewLineSymbols = useMemo(
    () => new Set(activePreview?.lineSymbols ?? []),
    [activePreview]
  );

  useEffect(() => {
    setHoveredChoiceKey(null);
  }, [viewModel]);

  useEffect(() => {
    onPreviewSymbolsChange?.(activePreview?.lineSymbols ?? []);
  }, [activePreview, onPreviewSymbolsChange]);

  useEffect(() => () => {
    onPreviewSymbolsChange?.([]);
  }, [onPreviewSymbolsChange]);

  const handleReturnToLive = () => {
    sessionStore.setHistoryIndex(null);
    if (sessionStore.getToastMessage() !== "Returned to the live position.") {
      sessionStore.setToastMessage("Returned to the live position.");
    }
  };

  const handleCellClick = async cellIndex => {
    if (historyMode) {
      handleReturnToLive();
      return;
    }

    if (!dispatch) {
      return;
    }

    await dispatch(stateRef.current, { type: GAME_ACTIONS.BOARD_CELL_CLICK, cellIndex });
  };

  const handleCollapseChoiceClick = async (event, cellIndex, symbol) => {
    event.stopPropagation();

    if (historyMode) {
      handleReturnToLive();
      return;
    }

    if (!dispatch) {
      return;
    }

    await dispatch(stateRef.current, {
      type: GAME_ACTIONS.COLLAPSE_SYMBOL_CLICK,
      cellIndex,
      symbol
    });
  };

  const handleCollapseChoiceLeave = () => {
    setHoveredChoiceKey(null);
  };

  return (
    <div className="game-board-wrap">
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        width={SVG_SIZE}
        height={SVG_SIZE}
        className="board-svg"
        role="grid"
        aria-label="Quantum tic-tac-toe board"
      >
        {viewModel.cells.map(cell => (
          <BoardCell
            key={cell.key}
            activePreview={activePreview}
            cell={cell}
            previewSymbolKeys={previewSymbolKeys}
            onCellClick={handleCellClick}
            onChoiceClick={handleCollapseChoiceClick}
            onChoiceHover={setHoveredChoiceKey}
            onChoiceLeave={handleCollapseChoiceLeave}
          />
        ))}

        <EntanglementLines
          lines={viewModel.entanglementLines}
          previewLineSymbols={previewLineSymbols}
        />
        <CyclePath cyclePath={viewModel.cyclePath} />
        <WinningLines lines={viewModel.winningLines} />
      </svg>
    </div>
  );
}

export const BoardStage = memo(BoardStageComponent, areBoardStagePropsEqual);
