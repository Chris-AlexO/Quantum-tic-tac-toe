export class CollapseReviewPanel {
  constructor() {
    this.root = document.createElement("section");
    this.root.className = "collapse-review-panel";

    this.titleEl = document.createElement("h3");
    this.titleEl.className = "collapse-review-title";

    this.bodyEl = document.createElement("p");
    this.bodyEl.className = "collapse-review-body";

    this.listEl = document.createElement("ol");
    this.listEl.className = "collapse-review-list";

    this.root.append(this.titleEl, this.bodyEl, this.listEl);
  }

  render(viewModel) {
    this.root.classList.toggle("is-visible", Boolean(viewModel?.isVisible));
    if (!viewModel?.isVisible) {
      this.listEl.replaceChildren();
      return;
    }

    this.titleEl.textContent = viewModel.title;
    this.bodyEl.textContent = viewModel.body;
    this.listEl.replaceChildren(
      ...viewModel.items.map(itemText => this.buildItem(itemText))
    );
  }

  buildItem(text) {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }
}
