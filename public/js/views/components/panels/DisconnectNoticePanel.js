export class DisconnectNoticePanel {
  constructor() {
    this.root = document.createElement("section");
    this.root.className = "disconnect-notice-panel";

    this.titleEl = document.createElement("h3");
    this.titleEl.className = "disconnect-notice-title";

    this.bodyEl = document.createElement("p");
    this.bodyEl.className = "disconnect-notice-body";

    this.root.append(this.titleEl, this.bodyEl);
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
