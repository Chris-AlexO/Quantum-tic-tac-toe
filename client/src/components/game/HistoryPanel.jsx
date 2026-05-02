export function HistoryPanel({ history, onPrev, onNext, onLive }) {
  return (
    <section className="history-panel">
      <p className="history-label">{history.label}</p>
      <div className="history-actions">
        <HistoryButton disabled={!history.canGoPrev} onClick={onPrev}>‹</HistoryButton>
        <HistoryButton disabled={!history.canGoNext} onClick={onNext}>›</HistoryButton>
        <HistoryButton live disabled={!history.canGoLive} onClick={onLive}>Live</HistoryButton>
      </div>
    </section>
  );
}

function HistoryButton({ live = false, ...props }) {
  return (
    <button
      type="button"
      className={live ? "history-button history-live-button" : "history-button"}
      {...props}
    />
  );
}
