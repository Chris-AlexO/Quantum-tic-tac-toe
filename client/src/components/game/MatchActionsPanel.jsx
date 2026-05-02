import { GameActionButton } from "./GameActionButton.jsx";

export function MatchActionsPanel({ viewModel, onAction }) {
  if (!viewModel.isVisible) {
    return null;
  }

  return (
    <section className="match-actions-panel">
      {viewModel.title ? <h3 className="match-actions-title">{viewModel.title}</h3> : null}
      {viewModel.body ? <p className="match-actions-body">{viewModel.body}</p> : null}
      <div className="match-actions-buttons">
        <GameActionButton model={viewModel.buttons.draw} variant="secondary" onAction={onAction} />
        <GameActionButton model={viewModel.buttons.restart} variant="secondary" onAction={onAction} />
        <GameActionButton model={viewModel.buttons.accept} onAction={onAction} />
        <GameActionButton model={viewModel.buttons.decline} variant="secondary" onAction={onAction} />
      </div>
    </section>
  );
}
