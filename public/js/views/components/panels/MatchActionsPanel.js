import { createButton } from "../../dom/createButton.js";

export class MatchActionsPanel {
  constructor({
    onRequestDraw,
    onRequestRestart,
    onAccept,
    onDecline,
    signal
  } = {}) {
    this.root = document.createElement("section");
    this.root.className = "match-actions-panel";

    this.titleEl = document.createElement("h3");
    this.titleEl.className = "match-actions-title";

    this.bodyEl = document.createElement("p");
    this.bodyEl.className = "match-actions-body";

    this.buttonsEl = document.createElement("div");
    this.buttonsEl.className = "match-actions-buttons";

    this.requestDrawButton = createButton({
      label: "Request draw",
      className: "game-secondary-button",
      onClick: onRequestDraw,
      signal
    });

    this.requestRestartButton = createButton({
      label: "Request restart",
      className: "game-secondary-button",
      onClick: onRequestRestart,
      signal
    });

    this.acceptButton = createButton({
      label: "Accept",
      className: "game-action-button",
      onClick: onAccept,
      signal
    });

    this.declineButton = createButton({
      label: "Decline",
      className: "game-secondary-button",
      onClick: onDecline,
      signal
    });

    this.buttonsEl.append(
      this.requestDrawButton,
      this.requestRestartButton,
      this.acceptButton,
      this.declineButton
    );

    this.root.append(this.titleEl, this.bodyEl, this.buttonsEl);
  }

  render(viewModel) {
    this.root.hidden = !viewModel?.isVisible;
    if (!viewModel?.isVisible) {
      this.applyButtonState(this.requestDrawButton, hiddenButtonState());
      this.applyButtonState(this.requestRestartButton, hiddenButtonState());
      this.applyButtonState(this.acceptButton, hiddenButtonState());
      this.applyButtonState(this.declineButton, hiddenButtonState());
      return;
    }

    this.titleEl.textContent = viewModel.title;
    this.bodyEl.textContent = viewModel.body;
    this.applyButtonState(this.requestDrawButton, viewModel.buttons.draw);
    this.applyButtonState(this.requestRestartButton, viewModel.buttons.restart);
    this.applyButtonState(this.acceptButton, viewModel.buttons.accept);
    this.applyButtonState(this.declineButton, viewModel.buttons.decline);
  }

  applyButtonState(button, buttonViewModel) {
    button.hidden = Boolean(buttonViewModel.hidden);
    button.disabled = Boolean(buttonViewModel.disabled);
    if (buttonViewModel.label) {
      button.textContent = buttonViewModel.label;
    }
  }
}

function hiddenButtonState() {
  return {
    hidden: true,
    disabled: false,
    label: ""
  };
}
