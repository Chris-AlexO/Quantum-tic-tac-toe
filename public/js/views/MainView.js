import { View } from "./View.js";
import { getPreferredRuleset, getSavedPlayerName, hasSavedPlayerName } from "../game/state.js";

export class MainView extends View {
  constructor(props, state) {
    super(props, state);
    this.name = "main";
    this.appConfig = props?.appConfig ?? {};
    this.nameInput = null;
    this.nameForm = null;
    this.nameSaveButton = null;
    this.welcomePanel = null;
    this.welcomeName = null;
    this.editNameButton = null;
    this.playerSetupCard = null;
    this.quickMatchButton = null;
    this.quickMatchHintWrap = null;
    this.joinToggleButton = null;
    this.joinCard = null;
    this.joinRoomInput = null;
    this.joinRoomButton = null;
    this.activeGamesButton = null;
    this.isJoinCardOpen = false;
    this.isSavingName = false;
    this.isEditingName = !hasSavedPlayerName();
    this.lastSavedName = getSavedPlayerName();
  }

  mount(root) {
    super.mount(root);

    this.container.classList.add("main-view", "main-view-dashboard");

    const header = this.addElement("section", { class: "main-header main-header-lobby" });
    this.addElement("p", {
      class: "main-eyebrow",
      textContent: ""
    }, header);

    this.addElement("h1", {
      class: "main-title",
      textContent: "Quantum Tic-Tac-Toe"
    }, header);

    this.addElement("p", {
      class: "main-subtitle",
      textContent: "By Chris-Alex Ouffoue"
    }, header);

    const topStack = this.addElement("section", { class: "main-top-stack" });
    this.buildRulesCard(topStack);
    this.buildPlayerSetupCard(topStack);
    this.buildJoinCard(topStack);

    const dashboard = this.addElement("section", { class: "main-dashboard-grid" });
    this.buildPlatformStatusCard(dashboard);
    this.buildActiveGamesCard(dashboard);
    if (this.appConfig.devMode) {
      this.buildDevAdminCard(dashboard);
    }

    this.updateMultiplayerControls();
    this.updateJoinCardState();
    this.syncNamePresentation(true);
  }

  buildRulesCard(parent) {
    const card = this.addElement("section", { class: "main-card main-rules-card" }, parent);
    const selectedRuleset = getPreferredRuleset();
    const rulesets = [
      {
        id: "house",
        label: "House rules",
        description: "Twin outcomes collapse using the house interpretation."
      },
      {
        id: "goff",
        label: "Allan Goff",
        description: "Play the classic Quantum Tic-Tac-Toe ruleset."
      }
    ];

    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Ruleset"
    }, card);

    /*this.addElement("p", {
      class: "main-card-copy",
      textContent: "Hover a ruleset to preview it, then click to use it for new games."
    }, card);*/

    const dock = this.addElement("div", { class: "main-ruleset-dock" }, card);
    const ruleButtons = [];

    rulesets.forEach(ruleset => {
      const wrap = this.addElement("div", {
        class: "main-tooltip-wrap has-tooltip",
        dataset: { tooltip: ruleset.description }
      }, dock);

      const button = this.addElement("button", {
        type: "button",
        class: `main-rule-chip ${selectedRuleset === ruleset.id ? "is-selected" : ""}`,
        textContent: ruleset.label
      }, wrap);

      button.addEventListener("click", () => {
        this.action.handleButtonAction({ type: "SET_RULESET", ruleset: ruleset.id });
        ruleButtons.forEach(el => el.classList.remove("is-selected"));
        button.classList.add("is-selected");
      }, { signal: this.domListenersAbort.signal });

      ruleButtons.push(button);
    });
  }

  buildPlayerSetupCard(parent) {
    const card = this.addElement("section", { class: "main-card main-player-setup-card" }, parent);
    this.playerSetupCard = card;

    const online = Boolean(this.appConfig.dbAvailable);

    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Player setup"
    }, card);

    this.addElement("p", {
      class: `main-requirement-pill ${getSavedPlayerName() ? "name-exists" : "no-name"} ${online ? "show" : "is-hidden"}`, /*${online ? "show" : "is-hidden"}*/
      textContent: "Name required for multiplayer"
    }, card);

    this.welcomePanel = this.addElement("div", {
      class: "main-welcome-panel"
    }, card);

    this.addElement("p", {
      class: "main-welcome-label",
      textContent: "Welcome"
    }, this.welcomePanel);

    this.welcomeName = this.addElement("p", {
      class: "main-welcome-name",
      textContent: ""
    }, this.welcomePanel);

    this.editNameButton = this.addElement("button", {
      type: "button",
      class: "main-edit-link",
      textContent: "Edit name"
    }, this.welcomePanel);

    this.editNameButton.addEventListener("click", () => {
      this.openNameEditing();
    }, { signal: this.domListenersAbort.signal });

    this.nameForm = this.addElement("form", { class: "main-inline-form" }, card);
    this.nameInput = this.addElement("input", {
      type: "text",
      placeholder: "Enter your name",
      class: "main-input",
      value: getSavedPlayerName()
    }, this.nameForm);

    this.nameSaveButton = this.addElement("button", {
      type: "submit",
      class: "main-primary-button",
      textContent: "Save name"
    }, this.nameForm);

    this.nameForm.addEventListener("submit", event => {
      event.preventDefault();
      if (this.isSavingName) {
        return;
      }

      const submittedName = this.nameInput.value.trim();
      this.isSavingName = true;
      this.syncNamePresentation();

      Promise.resolve(this.action.handleButtonAction({
        type: "SAVE_NAME",
        name: submittedName
      }))
        .then(saved => {
          if (saved) {
            this.isEditingName = false;
          }
        })
        .finally(() => {
          this.isSavingName = false;
          this.syncNamePresentation();
        });
    }, { signal: this.domListenersAbort.signal });

    const buttons = this.addElement("div", { class: "main-button-stack" }, card);

    const localButton = this.addElement("button", {
      type: "button",
      class: "main-secondary-button",
      textContent: "Local match"
    }, buttons);

    localButton.addEventListener("click", () => {
      this.action.handleButtonAction({ type: "LOCAL_MATCH" });
    }, { signal: this.domListenersAbort.signal });

    this.quickMatchHintWrap = this.addElement("div", {
      class: "main-tooltip-wrap"
    }, buttons);

    this.quickMatchButton = this.addElement("button", {
      type: "button",
      class: "main-secondary-button",
      textContent: "Quick match"
    }, this.quickMatchHintWrap);

    this.quickMatchButton.addEventListener("click", () => {
      this.action.handleButtonAction({ type: "QUICK_MATCH" });
    }, { signal: this.domListenersAbort.signal });

    this.joinToggleButton = this.addElement("button", {
      type: "button",
      class: "main-secondary-button",
      textContent: "Join by ID"
    }, buttons);

    this.joinToggleButton.addEventListener("click", () => {
      this.isJoinCardOpen = !this.isJoinCardOpen;
      this.updateJoinCardState();
    }, { signal: this.domListenersAbort.signal });
  }

  buildJoinCard(parent) {
    const card = this.addElement("section", { class: "main-card main-cascade-card" }, parent);
    this.joinCard = card;
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Join room"
    }, card);

    const form = this.addElement("form", { class: "main-inline-form" }, card);
    this.joinRoomInput = this.addElement("input", {
      type: "text",
      placeholder: "Enter room id",
      class: "main-input"
    }, form);

    this.joinRoomButton = this.addElement("button", {
      type: "submit",
      class: "main-primary-button",
      textContent: "Open room"
    }, form);

    form.addEventListener("submit", event => {
      event.preventDefault();
      const roomId = this.joinRoomInput.value.trim();
      if (!roomId) return;
      this.action.handleButtonAction({ type: "JOIN_MATCH", roomId });
    }, { signal: this.domListenersAbort.signal });
  }

  buildPlatformStatusCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Status"
    }, card);

    const online = Boolean(this.appConfig.dbAvailable);
    this.addElement("p", {
      class: `main-status-pill ${online ? "is-online" : "is-offline"}`,
      textContent: online ? "DB online" : "DB offline"
    }, card);
  }

  buildActiveGamesCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Active games"
    }, card);

    this.activeGamesButton = this.addElement("button", {
      type: "button",
      class: "main-secondary-button",
      textContent: "Active games"
    }, card);

    this.activeGamesButton.addEventListener("click", () => {
      this.action.handleButtonAction({ type: "ACTIVE_GAMES" });
    }, { signal: this.domListenersAbort.signal });
  }

  buildDevAdminCard(parent) {
    const card = this.addElement("section", { class: "main-card" }, parent);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Dev admin"
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

  updateView() {
    this.updateMultiplayerControls();
    this.updateJoinCardState();
    this.syncNamePresentation();
  }

  updateMultiplayerControls() {
    const hasName = hasSavedPlayerName();
    const multiplayerReady = Boolean(this.appConfig.multiplayerEnabled && hasName);
    const multiplayerReason = !this.appConfig.multiplayerEnabled
      ? "Multiplayer is unavailable while the database is offline."
      : !hasName
        ? "Save a clean player name before starting a multiplayer game."
        : "";

    if (this.quickMatchButton) {
      this.quickMatchButton.disabled = !multiplayerReady;
      this.quickMatchButton.setAttribute("aria-disabled", String(!multiplayerReady));
    }

    if (this.quickMatchHintWrap) {
      this.quickMatchHintWrap.dataset.tooltip = multiplayerReason;
      this.quickMatchHintWrap.classList.toggle("has-tooltip", Boolean(multiplayerReason));
    }

    if (this.joinRoomInput) {
      this.joinRoomInput.disabled = !multiplayerReady;
    }

    if (this.joinToggleButton) {
      this.joinToggleButton.disabled = !multiplayerReady;
      this.joinToggleButton.setAttribute("aria-disabled", String(!multiplayerReady));
    }

    if (this.joinRoomButton) {
      this.joinRoomButton.disabled = !multiplayerReady;
      this.joinRoomButton.setAttribute("aria-disabled", String(!multiplayerReady));
    }

    if (this.activeGamesButton) {
      this.activeGamesButton.disabled = !multiplayerReady;
      this.activeGamesButton.setAttribute("aria-disabled", String(!multiplayerReady));
    }
  }

  updateJoinCardState() {
    if (this.joinCard) {
      this.joinCard.classList.toggle("is-open", this.isJoinCardOpen);
      this.joinCard.setAttribute("aria-hidden", String(!this.isJoinCardOpen));
    }

    if (this.joinToggleButton) {
      this.joinToggleButton.classList.toggle("is-selected", this.isJoinCardOpen);
      this.joinToggleButton.setAttribute("aria-expanded", String(this.isJoinCardOpen));
    }
  }

  openNameEditing() {
    if (this.isSavingName) {
      return;
    }

    this.isEditingName = true;
    this.syncNamePresentation();
    this.nameInput?.focus();
    this.nameInput?.select();
  }

  syncNamePresentation(initial = false) {
    const savedName = getSavedPlayerName();
    const hasName = Boolean(savedName);

    if (hasName && savedName !== this.lastSavedName) {
      this.isEditingName = false;
    }

    if (this.nameInput && !this.isSavingName && (!this.isEditingName || document.activeElement !== this.nameInput)) {
      this.nameInput.value = savedName;
    }

    if (!this.isEditingName && !hasName) {
      this.isEditingName = true;
    }

    if (this.nameForm) {
      this.nameForm.classList.toggle("is-editing", this.isEditingName || !hasName);
      this.nameForm.classList.toggle("is-locked", !this.isEditingName && hasName);
      this.nameForm.classList.toggle("is-pending", this.isSavingName);
      this.nameForm.setAttribute("aria-hidden", String(!this.isEditingName && hasName));
    }

    if (this.nameInput) {
      this.nameInput.disabled = this.isSavingName || (!this.isEditingName && hasName);
    }

    if (this.nameSaveButton) {
      this.nameSaveButton.textContent = this.isSavingName
        ? "Saving..."
        : hasName ? "Update name" : "Save name";
      this.nameSaveButton.disabled = this.isSavingName || (!this.isEditingName && hasName);
    }

    if (this.welcomePanel) {
      this.welcomePanel.classList.toggle("is-visible", hasName);
      this.welcomePanel.classList.toggle("is-saving", this.isSavingName);
    }

    if (this.welcomeName) {
      this.welcomeName.textContent = savedName;
    }

    if (this.editNameButton) {
      this.editNameButton.hidden = this.isEditingName || !hasName;
      this.editNameButton.disabled = this.isSavingName;
    }

    if (!initial && hasName && savedName !== this.lastSavedName && this.welcomePanel) {
      this.welcomePanel.classList.remove("is-animated");
      void this.welcomePanel.offsetWidth;
      this.welcomePanel.classList.add("is-animated");
    }

    this.lastSavedName = savedName;
  }
}
