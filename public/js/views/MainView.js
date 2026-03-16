import { View } from "./View.js";
import { getPreferredRuleset } from "../game/state.js";

export class MainView extends View {
  constructor(props, state) {
    super(props, state);
    this.name = "main";
    this.appConfig = props?.appConfig ?? {};
  }

  mount(root) {
    super.mount(root);

    this.container.classList.add("main-view");

    const shell = this.addElement("section", { class: "main-shell" });
    const hero = this.addElement("div", { class: "main-hero" }, shell);
    const actions = this.addElement("div", { class: "main-actions" }, shell);

    this.addElement("p", {
      class: "main-eyebrow",
      textContent: "Quantum Tic-Tac-Toe"
    }, hero);

    this.addElement("h1", {
      class: "main-title",
      textContent: "Play deliberate, readable matches with local or live multiplayer rooms."
    }, hero);

    this.addElement("p", {
      class: "main-subtitle",
      textContent: "Set your display name, start a quick match, or join a room code directly. Finished games support rematches and spectator viewing."
    }, hero);

    this.buildNameCard(actions);
    this.buildPlatformStatusCard(actions);
    this.buildRulesCard(actions);
    this.buildActionCard(actions);
    this.buildJoinCard(actions);
    this.buildActiveGamesCard(actions);
    if (this.appConfig.devMode) {
      this.buildDevAdminCard(actions);
    }
  }

  buildRulesCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    const selectedRuleset = getPreferredRuleset();

    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Ruleset"
    }, card);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: "Choose the default ruleset for local games and newly created multiplayer rooms."
    }, card);

    const buttons = this.addElement("div", { class: "main-button-stack" }, card);
    const rulesets = [
      {
        id: "house",
        label: "House rules",
        copy: "Flexible collapse choice with your current QM-inspired resolution."
      },
      {
        id: "goff",
        label: "Allan Goff",
        copy: "Published two-outcome cycle measurement mode."
      }
    ];

    const buttonEls = [];

    rulesets.forEach(ruleset => {
      const button = this.addElement("button", {
        type: "button",
        class: `main-secondary-button ${selectedRuleset === ruleset.id ? "is-selected" : ""}`,
        textContent: `${ruleset.label} - ${ruleset.copy}`
      }, buttons);

      button.addEventListener("click", () => {
        this.action.handleButtonAction({ type: "SET_RULESET", ruleset: ruleset.id });
        buttonEls.forEach(el => el.classList.remove("is-selected"));
        button.classList.add("is-selected");
      }, { signal: this.domListenersAbort.signal });

      buttonEls.push(button);
    });
  }

  buildNameCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Player name"
    }, card);

    const form = this.addElement("form", { class: "main-inline-form" }, card);
    const input = this.addElement("input", {
      type: "text",
      placeholder: "Enter your name",
      class: "main-input"
    }, form);

    const save = this.addElement("button", {
      type: "submit",
      class: "main-primary-button",
      textContent: "Save name"
    }, form);

    form.addEventListener("submit", event => {
      event.preventDefault();
      this.action.handleButtonAction({
        type: "SAVE_NAME",
        name: input.value.trim()
      });
    }, { signal: this.domListenersAbort.signal });
  }

  buildActionCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Start a game"
    }, card);

    const buttons = this.addElement("div", { class: "main-button-stack" }, card);

    [
      { label: "Local match", type: "LOCAL_MATCH" },
      { label: "Quick match", type: "QUICK_MATCH" }
    ].forEach(action => {
      const button = this.addElement("button", {
        type: "button",
        class: "main-secondary-button",
        textContent: action.label,
        disabled: action.type === "QUICK_MATCH" && !this.appConfig.multiplayerEnabled ? "true" : null,
        ariaDisabled: action.type === "QUICK_MATCH" && !this.appConfig.multiplayerEnabled ? "true" : null
      }, buttons);

      button.addEventListener("click", () => {
        this.action.handleButtonAction({ type: action.type });
      }, { signal: this.domListenersAbort.signal });
    });
  }

  buildJoinCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Join room"
    }, card);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: this.appConfig.multiplayerEnabled
        ? "Paste a room id to join as player O if the room is still waiting, or as a spectator if the match is already underway."
        : "Multiplayer room entry is disabled while PostgreSQL is offline. Local games are still available."
    }, card);

    const form = this.addElement("form", { class: "main-inline-form" }, card);
    const input = this.addElement("input", {
      type: "text",
      placeholder: "Enter room id",
      class: "main-input",
      disabled: !this.appConfig.multiplayerEnabled ? "true" : null
    }, form);

    this.addElement("button", {
      type: "submit",
      class: "main-primary-button",
      textContent: "Open room",
      disabled: !this.appConfig.multiplayerEnabled ? "true" : null,
      ariaDisabled: !this.appConfig.multiplayerEnabled ? "true" : null
    }, form);

    form.addEventListener("submit", event => {
      event.preventDefault();
      const roomId = input.value.trim();
      if (!roomId) return;
      this.action.handleButtonAction({ type: "JOIN_MATCH", roomId });
    }, { signal: this.domListenersAbort.signal });
  }

  buildPlatformStatusCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Platform status"
    }, card);

    const online = Boolean(this.appConfig.dbAvailable);
    this.addElement("p", {
      class: `main-status-pill ${online ? "is-online" : "is-offline"}`,
      textContent: online ? "PostgreSQL online" : "PostgreSQL offline"
    }, card);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: online
        ? "Live multiplayer is available."
        : `${this.appConfig.dbStatusText || "Database unavailable"}. Only local games are available right now.`
    }, card);
  }

  buildActiveGamesCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Active games"
    }, card);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: this.appConfig.multiplayerEnabled
        ? "Browse active rooms from PostgreSQL and open them to join or spectate."
        : "Active games are unavailable while PostgreSQL is offline."
    }, card);

    const button = this.addElement("button", {
      type: "button",
      class: "main-secondary-button",
      textContent: "Active games",
      disabled: !this.appConfig.multiplayerEnabled ? "true" : null,
      ariaDisabled: !this.appConfig.multiplayerEnabled ? "true" : null
    }, card);

    button.addEventListener("click", () => {
      this.action.handleButtonAction({ type: "ACTIVE_GAMES" });
    }, { signal: this.domListenersAbort.signal });
  }

  buildDevAdminCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Dev admin"
    }, card);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: "Local-only admin scaffold for future Amazon RDS inspection and data edits."
    }, card);

    const button = this.addElement("button", {
      type: "button",
      class: "main-secondary-button",
      textContent: "Open admin"
    }, card);

    button.addEventListener("click", () => {
      this.action.handleButtonAction({ type: "DEV_ADMIN" });
    }, { signal: this.domListenersAbort.signal });
  }
}
