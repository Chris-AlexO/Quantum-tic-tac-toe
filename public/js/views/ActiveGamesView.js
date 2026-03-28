import { View } from "./View.js";

function formatUpdatedAt(value) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(date);
}

export class ActiveGamesView extends View {
  constructor(props, state) {
    super(props, state);
    this.name = "active-games";
    this.games = [];
  }

  async mount(root) {
    super.mount(root);
    this.container.classList.add("main-view");

    const shell = this.addElement("section", { class: "main-shell" });
    const hero = this.addElement("div", { class: "main-hero" }, shell);
    const actions = this.addElement("div", { class: "main-actions" }, shell);

    this.addElement("p", {
      class: "main-eyebrow",
      textContent: "Live rooms"
    }, hero);

    this.addElement("h1", {
      class: "main-title",
      textContent: "Active games"
    }, hero);

    this.addElement("p", {
      class: "main-subtitle",
      textContent: ""
    }, hero);

    this.listCard = this.addElement("section", { class: "main-card active-games-card" }, actions);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Room list"
    }, this.listCard);

    this.listBody = this.addElement("div", { class: "active-games-list" }, this.listCard);

    this.navCard = this.addElement("section", { class: "main-card" }, actions);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: ""
    }, this.navCard);

    const back = this.addElement("button", {
      type: "button",
      class: "main-primary-button",
      textContent: "Back to main menu"
    }, this.navCard);

    back.addEventListener("click", () => {
      this.action.handleButtonAction({ type: "MAIN_MENU" });
    }, { signal: this.domListenersAbort.signal });

    try {
      const payload = await this.reciever.listActiveGames();
      this.games = payload?.games ?? [];
      this.renderList(payload?.message ?? null);
    } catch (error) {
      this.renderError(error?.message || "Unable to load active games right now.");
    }
  }

  renderList(message) {
    this.listBody.replaceChildren();

    if (!this.games.length) {
      this.addElement("p", {
        class: "main-card-copy",
        textContent: message || "No active rooms."
      }, this.listBody);
      return;
    }

    this.games.forEach(game => {
      const item = this.addElement("article", { class: "active-game-item" }, this.listBody);
      const snapshot = game.snapshot ?? {};
      const players = snapshot.players ?? {};

      this.addElement("p", {
        class: "player-label",
        textContent: (game.status || "unknown").toUpperCase()
      }, item);

      this.addElement("h3", {
        class: "active-game-title",
        textContent: game.id
      }, item);

      this.addElement("p", {
        class: "main-card-copy",
        textContent: `${players.X?.name || "Player X"} vs ${players.O?.name || "Waiting..."}`
      }, item);

      this.addElement("p", {
        class: "main-card-copy",
        textContent: `${game.ruleset === "goff" ? "Allan Goff" : "House"} rules • Updated ${formatUpdatedAt(game.updatedAt)}`
      }, item);

      const button = this.addElement("button", {
        type: "button",
        class: "main-secondary-button",
        textContent: game.status === "waiting" ? "Open room" : "Spectate"
      }, item);

      button.addEventListener("click", () => {
        this.action.handleButtonAction({ type: "JOIN_MATCH", roomId: game.id });
      }, { signal: this.domListenersAbort.signal });
    });
  }
}
