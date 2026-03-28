import { createButton } from "../../dom/createButton.js";

export class LeavePromptPanel {
  constructor({
    onStay,
    onForfeit,
    signal
  } = {}) {
    this.root = document.createElement("section");
    this.root.className = "leave-confirm-panel";

    this.titleEl = document.createElement("h3");
    this.titleEl.className = "leave-confirm-title";

    this.bodyEl = document.createElement("p");
    this.bodyEl.className = "leave-confirm-body";

    this.actionsEl = document.createElement("div");
    this.actionsEl.className = "leave-confirm-actions";

    this.stayButton = createButton({
      label: "Stay in match",
      className: "game-secondary-button",
      onClick: onStay,
      signal
    });

    this.forfeitButton = createButton({
      label: "Leave and forfeit",
      className: "game-action-button",
      onClick: onForfeit,
      signal
    });

    this.actionsEl.append(this.stayButton, this.forfeitButton);
    this.root.append(this.titleEl, this.bodyEl, this.actionsEl);
  }

  render(viewModel) {
    this.root.classList.toggle("is-visible", Boolean(viewModel?.isVisible));
    if (!viewModel?.isVisible) {
      return;
    }

    this.titleEl.textContent = viewModel.title;
    this.bodyEl.textContent = viewModel.body;
  }
}
