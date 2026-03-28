export class StatusOverlayPanel {
  constructor() {
    this.root = document.createElement("div");
    this.root.className = "match-status-overlay";

    this.titleEl = document.createElement("h2");
    this.titleEl.className = "match-status-title";

    this.bodyEl = document.createElement("p");
    this.bodyEl.className = "match-status-body";

    this.countdownEl = document.createElement("div");
    this.countdownEl.className = "match-status-countdown";

    this.root.append(this.titleEl, this.bodyEl, this.countdownEl);
  }

  render(viewModel) {
    if (!viewModel?.isVisible) {
      this.root.classList.remove("is-visible");
      this.countdownEl.textContent = "";
      return;
    }

    this.titleEl.textContent = viewModel.title;
    this.bodyEl.textContent = viewModel.body;
    this.root.classList.add("is-visible");
  }

  setCountdownText(text) {
    this.countdownEl.textContent = text;
  }
}
