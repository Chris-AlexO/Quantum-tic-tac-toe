import { GameActionButton } from "./GameActionButton.jsx";

export function StatusOverlay({ viewModel, now, onAction }) {
  const countdownText = viewModel.countdownEndsAt
    ? `${Math.max(1, Math.ceil((viewModel.countdownEndsAt - now) / 1000))}`
    : "";

  return (
    <div className="status-overlay is-visible" role="status" aria-live="polite">
      <div className="status-overlay-card">
        <h2 className="status-overlay-title">{viewModel.title}</h2>
        {viewModel.body ? <p className="status-overlay-body">{viewModel.body}</p> : null}
        {countdownText ? <p className="status-overlay-countdown">{countdownText}</p> : null}
        {viewModel.actions ? (
          <div className="status-overlay-actions">
            <GameActionButton model={viewModel.actions.primary} onAction={onAction} />
            <GameActionButton
              model={viewModel.actions.secondary}
              variant="secondary"
              onAction={onAction}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
