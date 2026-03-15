import { View } from "./View.js";

export class ErrorView extends View {
  constructor(props, state) {
    super(props, state);
    this.name = "error";
    this.title = props?.title || "Something went wrong";
    this.message = props?.message || "The app could not complete that request.";
    this.primaryLabel = props?.primaryLabel || "Back to main menu";
    this.primaryAction = props?.primaryAction || { type: "MAIN_MENU" };
  }

  mount(root) {
    super.mount(root);
    this.container.classList.add("error-view");

    const panel = this.addElement("section", { class: "error-panel" });
    this.addElement("p", {
      class: "main-eyebrow",
      textContent: "Unavailable"
    }, panel);
    this.addElement("h1", {
      class: "error-title",
      textContent: this.title
    }, panel);
    this.addElement("p", {
      class: "error-copy",
      textContent: this.message
    }, panel);

    const actions = this.addElement("div", { class: "error-actions" }, panel);
    const primary = this.addElement("button", {
      type: "button",
      class: "main-primary-button",
      textContent: this.primaryLabel
    }, actions);

    primary.addEventListener("click", () => {
      this.action.handleButtonAction(this.primaryAction);
    }, { signal: this.domListenersAbort.signal });
  }
}
