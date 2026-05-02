import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getSavedPlayerName } from "../lib/playerProfile.js";
import { useGameActions } from "../hooks/game/useGameActions.js";
import { useGameBootstrap } from "../hooks/game/useGameBootstrap.js";
import { useGameViewState } from "../hooks/game/useGameViewState.js";
import { useOverlayCountdown } from "../hooks/game/useOverlayCountdown.js";
import { useAppConfig, useGameServices } from "../providers/AppServicesProvider.jsx";
import { BoardStage } from "../components/game/BoardStage.jsx";
import { PlayerCard } from "../components/game/PlayerCard.jsx";
import { HistoryPanel } from "../components/game/HistoryPanel.jsx";
import { WaveExpressionPanel } from "../components/game/WaveExpressionPanel.jsx";
import { MatchActionsPanel } from "../components/game/MatchActionsPanel.jsx";
import { StatusOverlay } from "../components/game/StatusOverlay.jsx";
import { SummaryModal } from "../components/game/SummaryModal.jsx";
import { GameActionButton } from "../components/game/GameActionButton.jsx";
import { HeroCard } from "../components/ui/Card.jsx";
import { GAME_ACTIONS } from "../../../shared/game/actions.js";

export function GameScreen({ local = false }) {
  const { roomId } = useParams();
  const { appConfig } = useAppConfig();
  const { gameClient, localGame, sessionStore } = useGameServices();
  const savedName = getSavedPlayerName();
  const { action, dispatch } = useGameActions();
  const {
    state,
    viewState,
    roomContext,
    setSummaryDismissed,
    setLeavePromptOpen
  } = useGameViewState({ local });
  const { loadError } = useGameBootstrap({
    action,
    gameClient,
    local,
    localGame,
    multiplayerEnabled: appConfig.multiplayerEnabled,
    roomId,
    savedName,
    sessionStore
  });
  const countdownNow = useOverlayCountdown(viewState.statusOverlay);
  const stateRef = useRef(state);
  const [wavePreviewSymbols, setWavePreviewSymbols] = useState(() => new Set());
  const handleWavePreviewSymbolsChange = useCallback((symbols) => {
    setWavePreviewSymbols(new Set(symbols ?? []));
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  if (!local && !savedName) {
    return <Navigate to="/" replace />;
  }

  if (!local && !appConfig.multiplayerEnabled) {
    return <Navigate to="/" replace />;
  }

  if (loadError) {
    return (
      <main className="app-shell">
        <HeroCard>
          <h1 className="app-title">Game unavailable</h1>
          <p className="app-subtitle">{loadError}</p>
        </HeroCard>
      </main>
    );
  }

  return (
    <main className="app-game-view">
      <aside className="app-game-controls">
        <HistoryPanel
          history={viewState.history}
          onPrev={() => stepHistory(viewState.history, -1, sessionStore)}
          onNext={() => stepHistory(viewState.history, 1, sessionStore)}
          onLive={() => sessionStore.setHistoryIndex(null)}
        />
        {!local ? (
          <MatchActionsPanel
            viewModel={viewState.matchActions}
            onAction={type => action?.handleButtonAction({ type })}
          />
        ) : null}
        {!local && viewState.disconnectNotice.isVisible ? (
          <InlinePanel
            title={viewState.disconnectNotice.title}
            body={viewState.disconnectNotice.body}
          />
        ) : null}
        {!local && viewState.leavePrompt.isVisible ? (
          <InlinePanel
            title={viewState.leavePrompt.title}
            body={viewState.leavePrompt.body}
            tone="danger"
            actions={[
              {
                label: "Stay",
                variant: "secondary",
                onClick: () => setLeavePromptOpen(false)
              },
              {
                label: "Forfeit",
                onClick: () => {
                  setLeavePromptOpen(false);
                  action?.handleButtonAction({ type: GAME_ACTIONS.LEAVE_GAME, forfeit: true });
                }
              }
            ]}
          />
        ) : null}
        <div className="app-game-action-stack">
          <GameActionButton
            onClick={() => {
              if (viewState.leavePrompt.shouldConfirm) {
                setLeavePromptOpen(true);
                return;
              }
              action?.handleButtonAction({ type: GAME_ACTIONS.LEAVE_GAME });
            }}
          >
            Leave game
          </GameActionButton>
          {local ? (
            <GameActionButton
              onClick={() => action?.handleButtonAction({ type: GAME_ACTIONS.LOCAL_RESTART })}
            >
              Restart match
            </GameActionButton>
          ) : null}
          {viewState.summary.isAvailable && !viewState.summary.isVisible ? (
            <GameActionButton variant="secondary" onClick={() => setSummaryDismissed(false)}>
              Match summary
            </GameActionButton>
          ) : null}
        </div>
      </aside>

      <section className="app-game-content">
        <div className="app-room-layout">
          <div className="status-banner" data-tone={roomContext.banner.tone}>
            {roomContext.banner.text}
          </div>
          <div className="app-room-main">
            <BoardStage
              collapseChooser={viewState.collapse.isCollapseChooser}
              dispatch={dispatch}
              displayState={viewState.displayState}
              historyMode={viewState.history.isHistoryMode}
              onPreviewSymbolsChange={handleWavePreviewSymbolsChange}
              sessionStore={sessionStore}
              showCollapseChoices={
                viewState.collapse.isCollapseChooser && !viewState.history.isHistoryMode
              }
              stateRef={stateRef}
            />
            <aside className="app-player-sidebar">
              <PlayerCard viewModel={roomContext.me} />
              <PlayerCard viewModel={roomContext.opponent} />
            </aside>
          </div>
          <WaveExpressionPanel
            board={viewState.displayState.game.board}
            cyclePath={viewState.displayState.game.cyclePath}
            previewSymbols={wavePreviewSymbols}
          />
        </div>
      </section>

      {state.ui.toastMessage ? <div className="game-toast is-visible">{state.ui.toastMessage}</div> : null}

      {viewState.statusOverlay.isVisible ? (
        <StatusOverlay
          viewModel={viewState.statusOverlay}
          now={countdownNow}
          onAction={type => action?.handleButtonAction({ type })}
        />
      ) : null}

      {viewState.summary.isVisible ? (
        <SummaryModal
          viewModel={viewState.summary}
          onClose={() => setSummaryDismissed(true)}
          onPrimary={() => {
            const actionType = viewState.summary.actions.primary.actionType;
            if (actionType) {
              action?.handleButtonAction({ type: actionType });
            }
          }}
          onSecondary={() => {
            const actionType = viewState.summary.actions.secondary.actionType;
            if (actionType) {
              action?.handleButtonAction({ type: actionType });
            }
          }}
        />
      ) : null}
    </main>
  );
}

function stepHistory(historyState, direction, sessionStore) {
  if (!historyState.isVisible) {
    return;
  }

  const currentIndex = historyState.historyIndex ?? historyState.latestIndex;
  const nextIndex = Math.max(0, Math.min(currentIndex + direction, historyState.latestIndex));

  if (nextIndex >= historyState.latestIndex) {
    sessionStore.setHistoryIndex(null);
    return;
  }

  sessionStore.setHistoryIndex(nextIndex);
}

function InlinePanel({ actions, body, tone = "default", title }) {
  const isDanger = tone === "danger";
  const titleId = isDanger ? "inline-panel-danger-title" : undefined;

  return (
    <section
      className={isDanger ? "leave-prompt-panel" : "game-inline-panel"}
      role={isDanger ? "alertdialog" : undefined}
      aria-labelledby={titleId}
    >
      <h3 className={isDanger ? "leave-prompt-title" : undefined} id={titleId}>{title}</h3>
      <p className={isDanger ? "leave-prompt-body" : undefined}>{body}</p>
      {actions?.length ? (
        <div className="leave-prompt-actions">
          {actions.map(action => (
            <GameActionButton
              key={action.label}
              variant={action.variant}
              onClick={action.onClick}
            >
              {action.label}
            </GameActionButton>
          ))}
        </div>
      ) : null}
    </section>
  );
}
