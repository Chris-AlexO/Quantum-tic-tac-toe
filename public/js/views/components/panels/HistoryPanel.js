import { createButton } from "../../dom/createButton.js";

export class HistoryPanel {
  constructor({
    onPrev,
    onNext,
    onLive,
    signal
  } = {}) {
    this.root = document.createElement("section");
    this.root.className = "history-panel";

    this.labelEl = document.createElement("p");
    this.labelEl.className = "history-label";

    this.actionsEl = document.createElement("div");
    this.actionsEl.className = "history-actions";

    this.prevButton = createButton({
      label: "‹",
      className: "history-button",
      onClick: onPrev,
      signal
    });
    this.prevButton.setAttribute("aria-label", "Previous position");

    this.nextButton = createButton({
      label: "›",
      className: "history-button",
      onClick: onNext,
      signal
    });
    this.nextButton.setAttribute("aria-label", "Next position");

    this.liveButton = createButton({
      label: "Live",
      className: "history-button history-live-button",
      onClick: onLive,
      signal
    });

    this.actionsEl.append(this.prevButton, this.nextButton, this.liveButton);
    this.root.append(this.labelEl, this.actionsEl);
  }

  render(viewModel) {
    this.root.hidden = !viewModel?.isVisible;
    if (!viewModel?.isVisible) {
      return;
    }

    this.labelEl.textContent = viewModel.label;
    this.prevButton.disabled = !viewModel.canGoPrev;
    this.nextButton.disabled = !viewModel.canGoNext;
    this.liveButton.disabled = !viewModel.canGoLive;
  }
}
