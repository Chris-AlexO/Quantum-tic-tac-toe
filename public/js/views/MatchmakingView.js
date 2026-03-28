import { on } from "../network/bus.js";
import { View } from "./View.js";

export class MatchmakingView extends View {
  constructor(props, state) {
    super(props, state);
    this.name = "matchmaking";
    this.phase = "searching";
    this.titleText = "Searching for a match";
    this.bodyText = "Checking for an available live room and preparing the board.";
    this.resolveTimeout = null;
    this.cancelled = false;
    this.waitingRoomId = null;
    this.hasResolved = false;
    this.turnOffRoomStateListeners = null;
  }

  async mount(root) {
    super.mount(root);
    this.container.classList.add("main-view", "matchmaking-view");
    this.turnOffRoomStateListeners = this.bindRoomStateListeners();

    const shell = this.addElement("section", { class: "main-shell" });
    const hero = this.addElement("div", { class: "main-hero matchmaking-hero" }, shell);
    const actions = this.addElement("div", { class: "main-actions" }, shell);

    this.addElement("p", {
      class: "main-eyebrow",
      textContent: "Multiplayer"
    }, hero);

    this.titleEl = this.addElement("h1", {
      class: "main-title",
      textContent: this.titleText
    }, hero);

    this.bodyEl = this.addElement("p", {
      class: "main-subtitle",
      textContent: this.bodyText
    }, hero);

    this.stageEl = this.addElement("div", {
      class: "matchmaking-stage",
      dataset: { phase: this.phase }
    }, hero);

    this.orbEl = this.addElement("div", {
      class: "matchmaking-orb"
    }, this.stageEl);

    this.labelEl = this.addElement("p", {
      class: "matchmaking-label",
      textContent: "Looking for a live room"
    }, this.stageEl);

    const statusCard = this.addElement("section", { class: "main-card" }, actions);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Matchmaking status"
    }, statusCard);

    this.statusCopyEl = this.addElement("p", {
      class: "main-card-copy",
      textContent: "This usually takes a moment. If another player is waiting, you will join instantly."
    }, statusCard);

    const navCard = this.addElement("section", { class: "main-card" }, actions);
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Controls"
    }, navCard);

    const cancelButton = this.addElement("button", {
      type: "button",
      class: "main-secondary-button",
      textContent: "Cancel search"
    }, navCard);

    cancelButton.addEventListener("click", () => {
      this.cancelled = true;
      if (this.waitingRoomId) {
        this.action.handleButtonAction({ type: "LEAVE_GAME" });
        return;
      }
      this.action.handleButtonAction({ type: "MAIN_MENU" });
    }, { signal: this.domListenersAbort.signal });

    await this.startSearch();
  }

  unmount(root) {
    this.cancelled = true;
    this.hasResolved = false;
    this.waitingRoomId = null;
    if (this.resolveTimeout) {
      clearTimeout(this.resolveTimeout);
      this.resolveTimeout = null;
    }
    this.turnOffRoomStateListeners?.();
    this.turnOffRoomStateListeners = null;

    super.unmount(root);
  }

  async startSearch() {
    const ack = await this.emitter.quickMatch();
    if (this.cancelled) {
      return;
    }

    if (!ack) {
      this.showFailure("Unable to reach matchmaking right now. Please try again.");
      return;
    }

    if (ack.status === "occupied" || ack.message === "Player already in a room") {
      this.phase = "found";
      this.renderStage("Current game found", "Returning you to your active match.", "Returning to active match");
      this.resolveTimeout = setTimeout(() => {
        if (this.cancelled) return;
        this.action.handleButtonAction({
          type: "OPEN_EXISTING_GAME",
          roomId: ack.roomId,
          local: ack.state?.session?.type === "local",
          message: ack.message || "Returning you to your active match."
        });
      }, 700);
      return;
    }

    if (ack.status !== "ok" || !ack.roomId) {
      this.showFailure(ack.message || "Unable to find a room right now. Please try again.");
      return;
    }

    if (ack.kind === "JOIN" || ack.mark === "O") {
      this.phase = "found";
      this.renderStage("Game found", "Opponent located. Joining the live board now.", "Opponent found");
      this.resolveMatch(ack.roomId, "Match found. Joining now.");
      return;
    }

    this.waitingRoomId = ack.roomId;
    this.phase = "searching";
    this.renderStage("Searching for a match", "Waiting for another player to join.", "Waiting for opponent");
  }

  showFailure(message) {
    this.phase = "error";
    this.renderStage("Search unavailable", message, "Unable to complete search");
  }

  bindRoomStateListeners() {
    const handlePayload = payload => {
      this.handleRoomState(payload?.state ?? null);
    };

    const offRoomState = on("room:state", handlePayload);
    const offRoomStarting = on("room:starting", handlePayload);
    const offRoomReady = on("room:ready", handlePayload);

    return () => {
      offRoomState();
      offRoomStarting();
      offRoomReady();
    };
  }

  handleRoomState(serverState) {
    if (this.cancelled || this.hasResolved || !this.waitingRoomId || !serverState) {
      return;
    }

    if (serverState.session?.roomId !== this.waitingRoomId) {
      return;
    }

    const hasBothPlayers = Boolean(
      serverState.players?.X?.playerId &&
      serverState.players?.O?.playerId
    );

    if (!hasBothPlayers) {
      return;
    }

    this.phase = "found";
    this.renderStage("Game found", "Opponent located. Joining the live board now.", "Opponent found");
    this.resolveMatch(this.waitingRoomId, "Match found. Joining now.");
  }

  resolveMatch(roomId, message) {
    if (this.cancelled || this.hasResolved || !roomId) {
      return;
    }

    this.hasResolved = true;
    this.resolveTimeout = setTimeout(() => {
      if (this.cancelled) return;
      this.action.handleButtonAction({
        type: "OPEN_EXISTING_GAME",
        roomId,
        local: false,
        replace: true,
        message
      });
    }, 700);
  }

  renderStage(title, body, label) {
    this.titleText = title;
    this.bodyText = body;

    if (this.titleEl) {
      this.titleEl.textContent = title;
    }

    if (this.bodyEl) {
      this.bodyEl.textContent = body;
    }

    if (this.stageEl) {
      this.stageEl.dataset.phase = this.phase;
    }

    if (this.labelEl) {
      this.labelEl.textContent = label;
    }

    if (this.statusCopyEl) {
      this.statusCopyEl.textContent = body;
    }
  }
}
