export function PlayerCard({ viewModel }) {
  return (
    <section
      className={[
        "player-display-container",
        viewModel.isActive ? "is-active" : "",
        viewModel.isWinner ? "is-winner" : "",
        viewModel.isDimmed ? "is-dimmed" : ""
      ].filter(Boolean).join(" ")}
      data-tone={viewModel.tone}
    >
      <div className="player-card-header">
        <span className="player-mark-badge">{viewModel.mark}</span>
        <p className="player-label">{viewModel.label}</p>
      </div>
      <p className="name">{viewModel.name}</p>
      <div className="player-chip-row">
        {!viewModel.showConnectionStatus ? null : (
          <p className="player-chip player-chip-status">{viewModel.connectionStatus}</p>
        )}
        <p className="player-chip player-chip-mark">{viewModel.mark}</p>
      </div>
      <div className="player-timer-panel">
        <p className="player-timer-label">{viewModel.timerLabel}</p>
        <p className="timer player-timer-value">{viewModel.time}</p>
      </div>
    </section>
  );
}
