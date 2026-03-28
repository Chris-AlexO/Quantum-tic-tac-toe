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

function formatExpiry(value) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

export class AdminView extends View {
  constructor(props, state) {
    super(props, state);
    this.name = "admin";
    this.appConfig = props?.appConfig ?? {};
    this.rooms = [];
    this.players = [];
    this.selectedRoomId = null;
    this.selectedPlayerId = null;
    this.selectedPayload = null;
    this.statusMessage = null;
  }

  async mount(root) {
    super.mount(root);

    this.container.classList.add("main-view");

    const shell = this.addElement("section", { class: "main-shell" });
    const hero = this.addElement("div", { class: "main-hero" }, shell);
    const actions = this.addElement("div", { class: "main-actions" }, shell);

    this.addElement("p", {
      class: "main-eyebrow",
      textContent: "Development only"
    }, hero);

    this.addElement("h1", {
      class: "main-title",
      textContent: "Database admin"
    }, hero);

    this.addElement("p", {
      class: "main-subtitle",
      textContent: "Inspect live PostgreSQL room and player records from the web app while you troubleshoot persistence and reconnect flows."
    }, hero);

    this.statusCard = this.addElement("section", { class: "main-card" }, actions);
    this.roomsCard = this.addElement("section", { class: "main-card admin-card" }, actions);
    this.playersCard = this.addElement("section", { class: "main-card admin-card" }, actions);
    this.detailCard = this.addElement("section", { class: "main-card admin-card" }, actions);
    this.navCard = this.addElement("section", { class: "main-card" }, actions);

    this.buildStatusCard();
    this.buildRoomsCard();
    this.buildPlayersCard();
    this.buildDetailCard();
    this.buildMaintenanceCard();
    this.buildNavigationCard();

    await this.refreshOverview();
  }

  buildStatusCard() {
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Runtime status"
    }, this.statusCard);

    this.dbPill = this.addElement("p", {
      class: `main-status-pill ${this.appConfig.dbAvailable ? "is-online" : "is-offline"}`,
      textContent: this.appConfig.dbAvailable ? "PostgreSQL online" : "PostgreSQL offline"
    }, this.statusCard);

    this.statusCopy = this.addElement("p", {
      class: "main-card-copy",
      textContent: this.appConfig.dbStatusText || "Database unavailable"
    }, this.statusCard);

    this.statusMessageEl = this.addElement("p", {
      class: "main-card-copy",
      textContent: "Loading latest room and player records."
    }, this.statusCard);

    this.refreshButton = this.addElement("button", {
      type: "button",
      class: "main-primary-button",
      textContent: "Refresh database view"
    }, this.statusCard);

    this.refreshButton.addEventListener("click", () => {
      this.refreshOverview();
    }, { signal: this.domListenersAbort.signal });
  }

  buildMaintenanceCard() {
    this.maintenanceCard = this.addElement("section", { class: "main-card" }, this.statusCard.parentElement);

    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Maintenance"
    }, this.maintenanceCard);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: "Rooms now expire 7 days after creation. Run the expiry batch manually here, or clear persisted records while debugging. Live in-memory rooms can repopulate the database on their next sync."
    }, this.maintenanceCard);

    this.runExpiryButton = this.addElement("button", {
      type: "button",
      class: "main-primary-button",
      textContent: "Run expiry job now"
    }, this.maintenanceCard);

    this.clearDbButton = this.addElement("button", {
      type: "button",
      class: "main-secondary-button admin-danger-button",
      textContent: "Clear persisted DB values"
    }, this.maintenanceCard);

    this.maintenanceMessageEl = this.addElement("p", {
      class: "main-card-copy",
      textContent: "No maintenance actions run yet."
    }, this.maintenanceCard);

    this.runExpiryButton.addEventListener("click", async () => {
      await this.runExpiryJob();
    }, { signal: this.domListenersAbort.signal });

    this.clearDbButton.addEventListener("click", async () => {
      await this.clearDatabase();
    }, { signal: this.domListenersAbort.signal });
  }

  buildRoomsCard() {
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Rooms"
    }, this.roomsCard);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: "Recent room records ordered by last update."
    }, this.roomsCard);

    this.roomsListEl = this.addElement("div", { class: "admin-list" }, this.roomsCard);
  }

  buildPlayersCard() {
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Players"
    }, this.playersCard);

    this.addElement("p", {
      class: "main-card-copy",
      textContent: "Recent player presence records ordered by last update."
    }, this.playersCard);

    this.playersListEl = this.addElement("div", { class: "admin-list" }, this.playersCard);
  }

  buildDetailCard() {
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Inspector"
    }, this.detailCard);

    this.detailCopy = this.addElement("p", {
      class: "main-card-copy",
      textContent: "Select a room or player to inspect the stored payload."
    }, this.detailCard);

    this.detailMeta = this.addElement("div", { class: "admin-detail-meta" }, this.detailCard);
    this.detailPre = this.addElement("pre", { class: "admin-json-view" }, this.detailCard);
  }

  buildNavigationCard() {
    this.addElement("h2", {
      class: "main-card-title",
      textContent: "Navigation"
    }, this.navCard);

    const button = this.addElement("button", {
      type: "button",
      class: "main-primary-button",
      textContent: "Back to main menu"
    }, this.navCard);

    button.addEventListener("click", () => {
      this.action.handleButtonAction({ type: "MAIN_MENU" });
    }, { signal: this.domListenersAbort.signal });
  }

  async refreshOverview() {
    this.setStatusMessage("Loading latest room and player records.");

    try {
      const payload = await this.reciever.getAdminOverview();
      this.rooms = payload?.rooms ?? [];
      this.players = payload?.players ?? [];
      this.appConfig = {
        ...this.appConfig,
        ...payload
      };

      this.dbPill.className = `main-status-pill ${payload?.dbAvailable ? "is-online" : "is-offline"}`;
      this.dbPill.textContent = payload?.dbAvailable ? "PostgreSQL online" : "PostgreSQL offline";
      this.statusCopy.textContent = payload?.dbStatusText || "Database unavailable";

      this.renderRooms();
      this.renderPlayers();

      if (this.selectedRoomId) {
        await this.inspectRoom(this.selectedRoomId);
      } else if (this.selectedPlayerId) {
        await this.inspectPlayer(this.selectedPlayerId);
      } else {
        this.renderInspector();
      }

      this.setStatusMessage(`Loaded ${this.rooms.length} rooms and ${this.players.length} players.`);
    } catch (error) {
      this.setStatusMessage(error?.message || "Unable to load database admin data.");
      this.renderRooms();
      this.renderPlayers();
      this.renderInspector(error?.message || "Unable to load database admin data.");
    }
  }

  setStatusMessage(message) {
    this.statusMessage = message;
    if (this.statusMessageEl) {
      this.statusMessageEl.textContent = message;
    }
  }

  renderRooms() {
    this.roomsListEl.replaceChildren();

    if (!this.rooms.length) {
      this.addElement("p", {
        class: "main-card-copy",
        textContent: "No room records returned."
      }, this.roomsListEl);
      return;
    }

    this.rooms.forEach(room => {
      const button = this.addElement("button", {
        type: "button",
        class: `admin-list-item ${this.selectedRoomId === room.id ? "is-selected" : ""}`
      }, this.roomsListEl);

      const title = this.addElement("strong", {
        class: "admin-item-title",
        textContent: room.id
      }, button);

      const meta = this.addElement("span", {
        class: "admin-item-meta",
        textContent: `${room.roomType} • ${room.ruleset === "goff" ? "goff" : "house"} • ${room.status} • ${formatUpdatedAt(room.updatedAt)}`
      }, button);

      const detail = this.addElement("span", {
        class: "admin-item-meta",
        textContent: `Turn ${room.currentTurn || "-"} • Next ${room.nextAction || "-"} • Expires ${formatExpiry(room.expiresAt)}`
      }, button);

      void title;
      void meta;
      void detail;

      button.addEventListener("click", async () => {
        this.selectedPlayerId = null;
        this.selectedRoomId = room.id;
        this.renderRooms();
        this.renderPlayers();
        await this.inspectRoom(room.id);
      }, { signal: this.domListenersAbort.signal });
    });
  }

  renderPlayers() {
    this.playersListEl.replaceChildren();

    if (!this.players.length) {
      this.addElement("p", {
        class: "main-card-copy",
        textContent: "No player records returned."
      }, this.playersListEl);
      return;
    }

    this.players.forEach(player => {
      const button = this.addElement("button", {
        type: "button",
        class: `admin-list-item ${this.selectedPlayerId === player.id ? "is-selected" : ""}`
      }, this.playersListEl);

      this.addElement("strong", {
        class: "admin-item-title",
        textContent: player.displayName || player.id
      }, button);

      this.addElement("span", {
        class: "admin-item-meta",
        textContent: `${player.id} • ${player.connectionStatus} • ${formatUpdatedAt(player.updatedAt)}`
      }, button);

      this.addElement("span", {
        class: "admin-item-meta",
        textContent: `Room ${player.activeRoomId || "-"} • Role ${player.activeRole || "-"} • Mark ${player.activeMark || "-"}`
      }, button);

      button.addEventListener("click", async () => {
        this.selectedRoomId = null;
        this.selectedPlayerId = player.id;
        this.renderRooms();
        this.renderPlayers();
        await this.inspectPlayer(player.id);
      }, { signal: this.domListenersAbort.signal });
    });
  }

  async inspectRoom(roomId) {
    this.detailCopy.textContent = `Loading room ${roomId}.`;
    this.detailMeta.replaceChildren();
    this.detailPre.textContent = "";

    try {
      const payload = await this.reciever.getAdminRoom(roomId);
      this.selectedPayload = payload?.room ?? null;
      this.renderInspector();
    } catch (error) {
      this.renderInspector(error?.message || "Unable to inspect this room.");
    }
  }

  async runExpiryJob() {
    this.setMaintenanceMessage("Running expiry job.");

    try {
      const payload = await this.reciever.runAdminExpiryJob();
      const deleted = payload?.result?.deletedRoomCount ?? 0;
      this.setMaintenanceMessage(
        deleted === 0
          ? "Expiry job finished. No expired rooms were removed."
          : `Expiry job finished. Removed ${deleted} expired room record${deleted === 1 ? "" : "s"}.`
      );
      await this.refreshOverview();
    } catch (error) {
      this.setMaintenanceMessage(error?.message || "Unable to run the expiry job.");
    }
  }

  async clearDatabase() {
    const confirmed = window.confirm(
      "Clear all persisted room and player records from PostgreSQL? Live in-memory rooms may write themselves back on the next sync."
    );
    if (!confirmed) {
      return;
    }

    this.setMaintenanceMessage("Clearing persisted database values.");

    try {
      await this.reciever.clearAdminDatabase();
      this.selectedRoomId = null;
      this.selectedPlayerId = null;
      this.selectedPayload = null;
      this.setMaintenanceMessage("Persisted room and player records were cleared.");
      await this.refreshOverview();
    } catch (error) {
      this.setMaintenanceMessage(error?.message || "Unable to clear persisted database values.");
    }
  }

  setMaintenanceMessage(message) {
    if (this.maintenanceMessageEl) {
      this.maintenanceMessageEl.textContent = message;
    }
  }

  async inspectPlayer(playerId) {
    this.detailCopy.textContent = `Loading player ${playerId}.`;
    this.detailMeta.replaceChildren();
    this.detailPre.textContent = "";

    try {
      const payload = await this.reciever.getAdminPlayer(playerId);
      this.selectedPayload = payload?.player ?? null;
      this.renderInspector();
    } catch (error) {
      this.renderInspector(error?.message || "Unable to inspect this player.");
    }
  }

  renderInspector(errorMessage = null) {
    this.detailMeta.replaceChildren();

    if (errorMessage) {
      this.detailCopy.textContent = errorMessage;
      this.detailPre.textContent = "";
      this.selectedPayload = null;
      return;
    }

    if (!this.selectedPayload) {
      this.detailCopy.textContent = "Select a room or player to inspect the stored payload.";
      this.detailPre.textContent = "";
      return;
    }

    if (this.selectedPayload.snapshot) {
      this.detailCopy.textContent = "Stored database payload for the selected record.";
      this.addInspectorRow("Type", this.selectedPayload.id ? "Room snapshot" : "Snapshot");
      if (this.selectedPayload.id) {
        this.addInspectorRow("Identifier", this.selectedPayload.id);
      }
      this.detailPre.textContent = prettyJson(this.selectedPayload.snapshot);
      return;
    }

    this.detailCopy.textContent = "Stored database payload for the selected player record.";
    this.detailPre.textContent = prettyJson(this.selectedPayload);
    Object.entries(this.selectedPayload).forEach(([label, value]) => {
      if (label === "snapshot") return;
      this.addInspectorRow(label, value == null ? "-" : String(value));
    });
  }

  addInspectorRow(label, value) {
    const row = this.addElement("div", { class: "admin-detail-row" }, this.detailMeta);

    this.addElement("span", {
      class: "admin-detail-label",
      textContent: label
    }, row);

    this.addElement("span", {
      class: "admin-detail-value",
      textContent: value
    }, row);
  }
}
