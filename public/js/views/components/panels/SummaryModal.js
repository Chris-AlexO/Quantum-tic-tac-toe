import { createButton } from "../../dom/createButton.js";

export class SummaryModal {
  constructor({
    onOpen,
    onClose,
    onPrimary,
    onSecondary,
    signal
  } = {}) {
    this.root = document.createElement("div");
    this.root.className = "summary-panel-shell";

    this.launcherButton = createButton({
      label: "Match summary",
      className: "summary-launcher",
      onClick: onOpen,
      signal
    });
    this.launcherButton.hidden = true;

    this.modalEl = document.createElement("section");
    this.modalEl.className = "game-summary-modal";

    this.headerEl = document.createElement("div");
    this.headerEl.className = "game-summary-header";

    this.titleEl = document.createElement("h2");
    this.titleEl.className = "game-summary-title";

    this.closeButton = createButton({
      label: "Close",
      className: "game-summary-close",
      onClick: onClose,
      signal
    });

    this.bodyEl = document.createElement("p");
    this.bodyEl.className = "game-summary-body";

    this.metaEl = document.createElement("div");
    this.metaEl.className = "game-summary-meta";

    this.actionsEl = document.createElement("div");
    this.actionsEl.className = "game-summary-actions";

    this.primaryButton = createButton({
      label: "Rematch",
      className: "game-summary-rematch",
      onClick: onPrimary,
      signal
    });

    this.secondaryButton = createButton({
      label: "Decline",
      className: "game-summary-decline",
      onClick: onSecondary,
      signal
    });

    this.actionsEl.append(this.primaryButton, this.secondaryButton);
    this.headerEl.append(this.titleEl, this.closeButton);
    this.modalEl.append(this.headerEl, this.bodyEl, this.metaEl, this.actionsEl);
    this.root.append(this.launcherButton, this.modalEl);
  }

  render(viewModel) {
    if (!viewModel?.isAvailable) {
      this.modalEl.classList.remove("is-visible");
      this.launcherButton.hidden = true;
      return;
    }

    this.titleEl.textContent = viewModel.title;
    this.bodyEl.textContent = viewModel.body;
    this.metaEl.replaceChildren(
      ...viewModel.metaItems.map(item => this.buildMetaItem(item.label, item.value))
    );

    this.actionsEl.hidden = Boolean(viewModel.actions.hidden);
    this.applyButtonState(this.primaryButton, viewModel.actions.primary);
    this.applyButtonState(this.secondaryButton, viewModel.actions.secondary);

    this.modalEl.classList.toggle("is-visible", Boolean(viewModel.isVisible));
    this.launcherButton.hidden = !viewModel.showLauncher;
  }

  applyButtonState(button, buttonViewModel) {
    button.hidden = Boolean(buttonViewModel?.hidden);
    button.disabled = Boolean(buttonViewModel?.disabled);
    if (buttonViewModel?.label) {
      button.textContent = buttonViewModel.label;
    }
  }

  buildMetaItem(label, value) {
    const row = document.createElement("div");
    row.className = "game-summary-meta-item";

    const labelEl = document.createElement("span");
    labelEl.className = "game-summary-meta-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "game-summary-meta-value";
    valueEl.textContent = value;

    row.append(labelEl, valueEl);
    return row;
  }
}
