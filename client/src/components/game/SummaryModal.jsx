import { useEffect, useRef } from "react";
import { GameActionButton } from "./GameActionButton.jsx";

export function SummaryModal({ viewModel, onClose, onPrimary, onSecondary }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    const previousActiveElement = document.activeElement;
    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    const focusable = Array.from(dialog.querySelectorAll(focusableSelector));
    const first = focusable[0] ?? dialog;
    const last = focusable[focusable.length - 1] ?? dialog;

    first.focus();

    const handleKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="summary-modal is-visible" role="presentation">
      <div
        className="summary-card"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-summary-title"
        tabIndex={-1}
      >
        <button type="button" className="summary-close" onClick={onClose}>Close</button>
        <h2 className="summary-title" id="match-summary-title">{viewModel.title}</h2>
        {viewModel.body ? <p className="summary-body">{viewModel.body}</p> : null}
        {viewModel.metaItems.length ? (
          <div className="summary-meta">
            {viewModel.metaItems.map(item => (
              <div key={item.label} className="summary-meta-row">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
        <div className="summary-actions">
          <GameActionButton model={viewModel.actions.primary} onClick={onPrimary} />
          <GameActionButton model={viewModel.actions.secondary} variant="secondary" onClick={onSecondary} />
        </div>
      </div>
    </div>
  );
}
