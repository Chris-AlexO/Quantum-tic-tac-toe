import { View } from "./View.js";
import { renderGameBoard, renderRoomState } from "../render.js";
import {
  getHistoryIndex,
  getTimeInterval,
  getToastMessage,
  handleServerStateUpdate,
  setHistoryIndex,
  setTimeInterval,
  setToastMessage,
} from "../game/state.js";
import { SoundManager } from "../SoundManager.js";

export class GameView extends View {
  constructor(props, state) {
    super(props, state);
    this.name = "game";
    this.state = state;

    this.roomId = props?.roomId;
    this.local = Boolean(props?.local);
    this.localGame = props?.localGame;

    this.controlsEl = document.createElement("div");
    this.contentEl = document.createElement("div");
    this.boardWrapEl = document.createElement("div");
    this.statusOverlayEl = document.createElement("div");
    this.statusOverlayTitleEl = document.createElement("h2");
    this.statusOverlayBodyEl = document.createElement("p");
    this.statusOverlayCountdownEl = document.createElement("div");
    this.toastEl = document.createElement("div");

    this.summaryLauncherEl = document.createElement("button");
    this.summaryModalEl = document.createElement("section");
    this.summaryModalHeaderEl = document.createElement("div");
    this.summaryModalTitleEl = document.createElement("h2");
    this.summaryModalCloseEl = document.createElement("button");
    this.summaryModalBodyEl = document.createElement("p");
    this.summaryMetaEl = document.createElement("div");
    this.summaryActionsEl = document.createElement("div");
    this.summaryRematchBtn = document.createElement("button");
    this.summaryDeclineBtn = document.createElement("button");
    this.historyPanelEl = document.createElement("section");
    this.historyLabelEl = document.createElement("p");
    this.historyActionsEl = document.createElement("div");
    this.historyPrevBtn = document.createElement("button");
    this.historyNextBtn = document.createElement("button");
    this.historyLiveBtn = document.createElement("button");

    this.collapseReviewEl = document.createElement("section");
    this.collapseReviewTitleEl = document.createElement("h3");
    this.collapseReviewBodyEl = document.createElement("p");
    this.collapseReviewListEl = document.createElement("ol");
    this.matchActionsEl = document.createElement("section");
    this.matchActionsTitleEl = document.createElement("h3");
    this.matchActionsBodyEl = document.createElement("p");
    this.matchActionsButtonsEl = document.createElement("div");
    this.requestDrawBtn = document.createElement("button");
    this.requestRestartBtn = document.createElement("button");
    this.requestAcceptBtn = document.createElement("button");
    this.requestDeclineBtn = document.createElement("button");

    this.rematchBtn = null;
    this.leaveBtn = null;
    this.localRestartBtn = null;
    this.countdownTick = null;
    this.toastTimeout = null;

    this.lastSummaryKey = null;
    this.summaryDismissed = false;

    this.sounds = new SoundManager();
  }

  async mount(root) {
    super.mount(root);

    this.container.classList.add("game-view");
    this.controlsEl.classList.add("game-controls");
    this.contentEl.classList.add("game-content");
    this.boardWrapEl.classList.add("game-board-wrap");

    this.statusOverlayEl.classList.add("match-status-overlay");
    this.statusOverlayTitleEl.classList.add("match-status-title");
    this.statusOverlayBodyEl.classList.add("match-status-body");
    this.statusOverlayCountdownEl.classList.add("match-status-countdown");
    this.statusOverlayEl.append(
      this.statusOverlayTitleEl,
      this.statusOverlayBodyEl,
      this.statusOverlayCountdownEl
    );

    this.toastEl.classList.add("game-toast");

    this.buildSummaryModal();
    this.buildCollapseReviewPanel();
    this.buildHistoryPanel();
    this.buildMatchActionsPanel();

    this.contentEl.appendChild(this.boardWrapEl);
    this.container.append(
      this.controlsEl,
      this.contentEl,
      this.statusOverlayEl,
      this.toastEl,
      this.summaryLauncherEl,
      this.summaryModalEl,
      this.matchActionsEl,
      this.collapseReviewEl
    );

    this.leaveBtn = this.buildActionButton("Leave Game", { type: "MAIN_MENU" });
    this.controlsEl.appendChild(this.leaveBtn);

    if (this.local) {
      this.localRestartBtn = this.buildActionButton("Restart Match", { type: "LOCAL_RESTART" });
      this.controlsEl.appendChild(this.localRestartBtn);
    }

    this.rematchBtn = this.local
      ? this.buildActionButton("Play Again", { type: "REMATCH_REQUEST" })
      : this.buildInteractiveButton("Match summary", () => {
          this.openSummaryModal();
        }, "game-secondary-button");
    this.rematchBtn.hidden = true;
    this.controlsEl.appendChild(this.rematchBtn);

    if (this.local) {
      this.localGame.startMatch();
      return;
    }

    const entry = await this.reciever.enterRoom(this.roomId);
    const { status, state, mark, role } = entry;

    if (status === "nogame") {
      this.renderError(`Cannot find this game ${this.roomId}`);
    } else if (status === "occupied") {
      this.action.handleButtonAction({
        type: "OPEN_EXISTING_GAME",
        roomId: entry.roomId,
        local: entry.state?.session?.type === "local",
        message: entry.message
      });
    } else if (status === "ok") {
      this.state = state;
      handleServerStateUpdate(state, mark, role);

      if (role !== "spectator") {
        const readyPayload = await this.reciever.clientReady(this.roomId);
        if (readyPayload?.state) {
          handleServerStateUpdate(
            readyPayload.state,
            readyPayload.mark ?? mark,
            readyPayload.role ?? role
          );
        }
      }
    }
  }

  render() {}

  updateView(state) {
    this.state = state;
    const isCollapseChooser = this.isCollapseChooser(state);
    const shouldToastCollapseWait =
      state.game.nextAction === "collapse" &&
      !isCollapseChooser &&
      state.session.role !== "spectator";
    const displayState = this.getDisplayState(state);
    const isHistoryMode = this.isHistoryMode(state);

    const { svg, clickables } = renderGameBoard(displayState, {
      showCollapseChoices: isCollapseChooser && !isHistoryMode,
      collapseChooser: isCollapseChooser,
    });
    const roomState = renderRoomState(state);

    if (this.rematchBtn) {
      this.rematchBtn.hidden =
        state.session.status !== "finished" || state.session.role === "spectator";
      this.rematchBtn.textContent = this.local ? "Play Again" : "Match summary";
    }

    clickables.forEach(clickable => {
      const { type, cellIndex, symbol, element } = clickable;

      element.addEventListener(
        "click",
        async () => {
          if (isHistoryMode) {
            setHistoryIndex(null);
            if (getToastMessage() !== "Returned to the live position.") {
              setToastMessage("Returned to the live position.");
            }
            return;
          }

          const outcome = await this.dispatch(state, { type, cellIndex, symbol });
          if (outcome === "LOCKED" || outcome === "REJECTED") {
            this.sounds.play("failmove");
            return;
          }
          if (outcome === "PENDING") {
            return;
          }
          this.sounds.play("move");
        },
        { signal: this.domListenersAbort.signal }
      );
    });

    this.renderStatusOverlay(state);
    this.renderMatchActions(state);
    if (shouldToastCollapseWait) {
      this.pushCollapseWaitToast(state);
    }
    this.renderToast(state);
    this.renderSummaryModal(state);
    this.renderCollapseReview(state);
    this.renderHistoryPanel(state);

    this.boardWrapEl.replaceChildren(svg);
    this.contentEl.replaceChildren(roomState, this.boardWrapEl);
  }

  unmount(root) {
    this.stopCountdownTick();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    const timeInterval = getTimeInterval();
    if (timeInterval) {
      clearInterval(timeInterval);
      setTimeInterval(null);
    }

    if (this.local) {
      this.localGame.stop();
    }

    super.unmount(root);
  }

  buildActionButton(label, action) {
    return this.buildInteractiveButton(label, () => {
      this.action.handleButtonAction(action);
    }, "game-action-button");
  }

  buildInteractiveButton(label, onClick, className = "game-action-button") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener("click", onClick, { signal: this.domListenersAbort.signal });
    return btn;
  }

  buildSummaryModal() {
    this.summaryLauncherEl.type = "button";
    this.summaryLauncherEl.className = "summary-launcher";
    this.summaryLauncherEl.textContent = "Match summary";
    this.summaryLauncherEl.hidden = true;
    this.summaryLauncherEl.addEventListener("click", () => {
      this.openSummaryModal();
    }, { signal: this.domListenersAbort.signal });

    this.summaryModalEl.className = "game-summary-modal";
    this.summaryModalHeaderEl.className = "game-summary-header";
    this.summaryModalTitleEl.className = "game-summary-title";

    this.summaryModalCloseEl.type = "button";
    this.summaryModalCloseEl.className = "game-summary-close";
    this.summaryModalCloseEl.textContent = "Close";
    this.summaryModalCloseEl.addEventListener("click", () => {
      this.summaryDismissed = true;
      this.renderSummaryModal(this.state);
    }, { signal: this.domListenersAbort.signal });

    this.summaryModalBodyEl.className = "game-summary-body";
    this.summaryMetaEl.className = "game-summary-meta";
    this.summaryActionsEl.className = "game-summary-actions";

    this.summaryRematchBtn = this.buildInteractiveButton("Rematch", () => {
      this.handleSummaryPrimaryAction();
    }, "game-summary-rematch");

    this.summaryDeclineBtn = this.buildInteractiveButton("Decline", () => {
      this.action.handleButtonAction({ type: "REMATCH_DECLINE" });
    }, "game-summary-decline");

    this.summaryActionsEl.append(this.summaryRematchBtn, this.summaryDeclineBtn);
    this.summaryModalHeaderEl.append(this.summaryModalTitleEl, this.summaryModalCloseEl);
    this.summaryModalEl.append(
      this.summaryModalHeaderEl,
      this.summaryModalBodyEl,
      this.summaryMetaEl,
      this.summaryActionsEl
    );
  }

  buildCollapseReviewPanel() {
    this.collapseReviewEl.className = "collapse-review-panel";
    this.collapseReviewTitleEl.className = "collapse-review-title";
    this.collapseReviewBodyEl.className = "collapse-review-body";
    this.collapseReviewListEl.className = "collapse-review-list";

    this.collapseReviewEl.append(
      this.collapseReviewTitleEl,
      this.collapseReviewBodyEl,
      this.collapseReviewListEl
    );
  }

  buildHistoryPanel() {
    this.historyPanelEl.className = "history-panel";
    this.historyLabelEl.className = "history-label";
    this.historyActionsEl.className = "history-actions";

    this.historyPrevBtn = this.buildInteractiveButton("Previous", () => {
      this.stepHistory(-1);
    }, "history-button");
    this.historyPrevBtn.setAttribute("aria-label", "Previous position");

    this.historyNextBtn = this.buildInteractiveButton("›", () => {
      this.stepHistory(1);
    }, "history-button");
    this.historyNextBtn.setAttribute("aria-label", "Next position");

    this.historyLiveBtn = this.buildInteractiveButton("Live", () => {
      setHistoryIndex(null);
    }, "history-button history-live-button");
    this.historyPrevBtn.textContent = "‹";

    this.historyActionsEl.append(
      this.historyPrevBtn,
      this.historyNextBtn,
      this.historyLiveBtn
    );

    this.historyPanelEl.append(this.historyLabelEl, this.historyActionsEl);
    this.controlsEl.appendChild(this.historyPanelEl);
  }

  buildMatchActionsPanel() {
    this.matchActionsEl.className = "match-actions-panel";
    this.matchActionsTitleEl.className = "match-actions-title";
    this.matchActionsBodyEl.className = "match-actions-body";
    this.matchActionsButtonsEl.className = "match-actions-buttons";

    this.requestDrawBtn = this.buildInteractiveButton("Request draw", () => {
      this.action.handleButtonAction({ type: "DRAW_REQUEST" });
    }, "game-secondary-button");

    this.requestRestartBtn = this.buildInteractiveButton("Request restart", () => {
      this.action.handleButtonAction({ type: "REMATCH_REQUEST" });
    }, "game-secondary-button");

    this.requestAcceptBtn = this.buildInteractiveButton("Accept", () => {
      const activeRequest = this.getActiveMatchRequest(this.state);
      if (!activeRequest) return;

      this.action.handleButtonAction({
        type: activeRequest.type === "draw" ? "DRAW_ACCEPT" : "REMATCH_ACCEPT"
      });
    }, "game-action-button");

    this.requestDeclineBtn = this.buildInteractiveButton("Decline", () => {
      const activeRequest = this.getActiveMatchRequest(this.state);
      if (!activeRequest) return;

      this.action.handleButtonAction({
        type: activeRequest.type === "draw" ? "DRAW_DECLINE" : "REMATCH_DECLINE"
      });
    }, "game-secondary-button");

    this.matchActionsButtonsEl.append(
      this.requestDrawBtn,
      this.requestRestartBtn,
      this.requestAcceptBtn,
      this.requestDeclineBtn
    );

    this.matchActionsEl.append(
      this.matchActionsTitleEl,
      this.matchActionsBodyEl,
      this.matchActionsButtonsEl
    );
  }

  renderStatusOverlay(state) {
    const details = this.getOverlayDetails(state);

    if (!details) {
      this.statusOverlayEl.classList.remove("is-visible");
      this.stopCountdownTick();
      return;
    }

    this.statusOverlayTitleEl.textContent = details.title;
    this.statusOverlayBodyEl.textContent = details.body;
    this.statusOverlayEl.classList.add("is-visible");

    if (details.countdownEndsAt) {
      this.updateCountdown(details.countdownEndsAt);
      this.startCountdownTick(details.countdownEndsAt);
    } else {
      this.statusOverlayCountdownEl.textContent = "";
      this.stopCountdownTick();
    }
  }

  renderToast(state) {
    const message = state.ui.toastMessage;
    if (!message) {
      this.toastEl.classList.remove("is-visible");
      this.toastEl.textContent = "";
      return;
    }

    this.toastEl.textContent = message;
    this.toastEl.classList.add("is-visible");

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.toastTimeout = null;
      if (getToastMessage() === message) {
        setToastMessage(null);
      }
    }, 2600);
  }

  renderSummaryModal(state) {
    const summaryKey = this.getSummaryKey(state);
    if (!summaryKey) {
      this.summaryModalEl.classList.remove("is-visible");
      this.summaryLauncherEl.hidden = true;
      this.lastSummaryKey = null;
      this.summaryDismissed = false;
      return;
    }

    if (summaryKey !== this.lastSummaryKey) {
      this.lastSummaryKey = summaryKey;
      this.summaryDismissed = false;
    }

    this.summaryModalTitleEl.textContent =
      state.game.winner === "draw" ? "Match complete" : `${state.game.winner} wins`;

    this.summaryModalBodyEl.textContent = this.getSummaryBody(state);
    this.summaryMetaEl.replaceChildren(
      this.buildSummaryMetaItem("Result", this.getResultLabel(state)),
      this.buildSummaryMetaItem("Phase", this.getPhaseLabel(state)),
      this.buildSummaryMetaItem("Role", state.session.role === "spectator" ? "Spectator" : "Player"),
      this.buildSummaryMetaItem("Room", state.session.type === "local" ? "Local match" : "Live room")
    );

    const rematchState = state.session.rematchRequest;
    const hasIncomingRequest =
      Boolean(rematchState) && rematchState.requesterMark !== state.session.playerMark;
    const hasOutgoingRequest =
      Boolean(rematchState) && rematchState.requesterMark === state.session.playerMark;

    this.summaryActionsEl.hidden = state.session.role === "spectator";
    this.summaryDeclineBtn.hidden = !hasIncomingRequest;
    this.summaryDeclineBtn.disabled = false;

    if (state.session.role === "spectator") {
      this.summaryRematchBtn.hidden = true;
      this.summaryDeclineBtn.hidden = true;
    } else if (this.local) {
      this.summaryRematchBtn.hidden = false;
      this.summaryRematchBtn.disabled = false;
      this.summaryRematchBtn.textContent = "Play again";
    } else if (hasIncomingRequest) {
      this.summaryRematchBtn.hidden = false;
      this.summaryRematchBtn.disabled = false;
      this.summaryRematchBtn.textContent = "Accept rematch";
    } else if (hasOutgoingRequest) {
      this.summaryRematchBtn.hidden = false;
      this.summaryRematchBtn.disabled = true;
      this.summaryRematchBtn.textContent = "Request sent";
    } else {
      this.summaryRematchBtn.hidden = false;
      this.summaryRematchBtn.disabled = false;
      this.summaryRematchBtn.textContent = "Request rematch";
    }

    this.summaryModalEl.classList.toggle("is-visible", !this.summaryDismissed);
    this.summaryLauncherEl.hidden = !this.summaryDismissed;
  }

  renderCollapseReview(state) {
    const shouldShow =
      state.game.nextAction === "collapse" &&
      Array.isArray(state.game.cyclePath) &&
      this.isCollapseChooser(state);

    this.collapseReviewEl.classList.toggle("is-visible", shouldShow);
    if (!shouldShow) {
      return;
    }

    this.collapseReviewTitleEl.textContent = "Review collapse cycle";
    this.collapseReviewBodyEl.textContent =
      "This entanglement cycle triggered a manual collapse. Review the sequence below and choose the resolving symbol directly from the board.";

    const items = state.game.cyclePath.map(([square, symbol], index) =>
      this.buildCycleReviewItem(`${index + 1}. ${symbol} in square ${square + 1}`)
    );
    this.collapseReviewListEl.replaceChildren(...items);
  }

  renderHistoryPanel(state) {
    const totalPositions = state.boardHistory?.length ?? 0;
    const historyIndex = getHistoryIndex();
    const latestIndex = totalPositions - 1;
    const displayIndex = historyIndex ?? latestIndex;
    const isHistoryMode = historyIndex != null && historyIndex < latestIndex;

    this.historyPanelEl.hidden = totalPositions < 2;
    if (totalPositions < 2) {
      return;
    }

    this.historyLabelEl.textContent = isHistoryMode
      ? `Reviewing position ${displayIndex + 1} of ${totalPositions}`
      : `Live position ${displayIndex + 1} of ${totalPositions}`;

    this.historyPrevBtn.disabled = displayIndex <= 0;
    this.historyNextBtn.disabled = !isHistoryMode;
    this.historyLiveBtn.disabled = !isHistoryMode;
  }

  renderMatchActions(state) {
    const activeRequest = this.getActiveMatchRequest(state);
    const isPlayer = state.session.role === "player";
    const isMultiplayer = state.session.type === "mp";
    const isPlaying = state.session.status === "playing";
    const canRequestDuringPlay =
      isPlayer &&
      isMultiplayer &&
      isPlaying &&
      !activeRequest;

    if (this.localRestartBtn) {
      this.localRestartBtn.hidden = state.session.status === "waiting";
    }

    this.matchActionsEl.hidden = !isPlayer || !isMultiplayer || !isPlaying || (!canRequestDuringPlay && !activeRequest);
    if (this.matchActionsEl.hidden) {
      return;
    }

    const isIncoming = activeRequest && activeRequest.requesterMark !== state.session.playerMark;

    this.requestDrawBtn.hidden = !canRequestDuringPlay;
    this.requestRestartBtn.hidden = !canRequestDuringPlay;
    this.requestAcceptBtn.hidden = !isIncoming;
    this.requestDeclineBtn.hidden = !isIncoming;
    this.requestAcceptBtn.textContent = activeRequest?.type === "draw" ? "Accept draw" : "Accept restart";
    this.requestDeclineBtn.textContent = activeRequest?.type === "draw" ? "Decline draw" : "Decline restart";

    if (!activeRequest) {
      this.matchActionsTitleEl.textContent = "Match actions";
      this.matchActionsBodyEl.textContent =
        "You can propose a draw or request a restart without leaving this room.";
      return;
    }

    const requestLabel = activeRequest.type === "draw" ? "draw" : "restart";
    this.matchActionsTitleEl.textContent =
      activeRequest.type === "draw" ? "Draw request" : "Restart request";
    this.matchActionsBodyEl.textContent = isIncoming
      ? `Your opponent wants a ${requestLabel}. Accept to apply it now, or decline to keep playing.`
      : `Your ${requestLabel} request has been sent. The match will continue until the other player responds.`;
  }

  buildSummaryMetaItem(label, value) {
    const row = document.createElement("div");
    row.className = "game-summary-meta-item";

    const dt = document.createElement("span");
    dt.className = "game-summary-meta-label";
    dt.textContent = label;

    const dd = document.createElement("span");
    dd.className = "game-summary-meta-value";
    dd.textContent = value;

    row.append(dt, dd);
    return row;
  }

  buildCycleReviewItem(text) {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }

  getOverlayDetails(state) {
    const { session, players } = state;

    if (session.status === "waiting") {
      if (session.type === "local") {
        return {
          title: "Setting up local match",
          body: "Loading the board and player clocks.",
        };
      }

      if (session.role === "spectator") {
        return {
          title: "Joining as spectator",
          body: "Loading the current board and subscribing to live updates.",
        };
      }

      if (players.opponent.connectionStatus === "offline" || players.opponent.name === "Searching...") {
        return {
          title: "Room created",
          body: "Waiting for another player to join before the match can begin.",
        };
      }

      return {
        title: "Players connected",
        body: "Preparing the match and confirming both clients are ready.",
      };
    }

    if (session.status === "starting") {
      return {
        title: session.type === "local" ? "Local match starting" : "Match starting",
        body: "Get ready. The board will unlock after the countdown.",
        countdownEndsAt: session.countdownEndsAt,
      };
    }

    return null;
  }

  getSummaryKey(state) {
    if (state.session.status !== "finished") {
      return null;
    }

    return `${state.session.roomId}:${state.game.winner}:${JSON.stringify(state.game.winningLine ?? [])}`;
  }

  getActiveMatchRequest(state) {
    if (!state) return null;

    if (state.session.drawRequest) {
      return {
        ...state.session.drawRequest,
        type: "draw"
      };
    }

    if (state.session.rematchRequest) {
      return {
        ...state.session.rematchRequest,
        type: "rematch"
      };
    }

    return null;
  }

  getSummaryBody(state) {
    const rematchRequest = state.session.rematchRequest;

    if (state.game.winner === "draw") {
      if (rematchRequest) {
        return this.getRematchSummaryBody(state, rematchRequest);
      }
      return "The game finished in a draw. Review the final board state and decide whether to start another round.";
    }

    if (state.session.role === "spectator") {
      return `Player ${state.game.winner} closed out the match. You can keep watching the board or leave the room.`;
    }

    if (rematchRequest) {
      return this.getRematchSummaryBody(state, rematchRequest);
    }

    const didWin = state.session.playerMark === state.game.winner;
    return didWin
      ? "Strong finish. You secured the winning line and can send a rematch request from here if both players want another round."
      : "The match has concluded. Review the final position and decide whether you want to request a rematch.";
  }

  getResultLabel(state) {
    if (state.game.winner === "draw") {
      return "Draw";
    }
    return `Winner: ${state.game.winner}`;
  }

  getPhaseLabel(state) {
    const rematchRequest = state.session.rematchRequest;
    if (rematchRequest) {
      if (state.session.role === "spectator") {
        return "Rematch pending";
      }
      return rematchRequest.requesterMark === state.session.playerMark
        ? "Rematch requested"
        : "Response needed";
    }
    return "Finished";
  }

  getRematchSummaryBody(state, rematchRequest) {
    const requesterMark = rematchRequest.requesterMark;

    if (state.session.role === "spectator") {
      return `Player ${requesterMark} has requested a rematch. You can keep watching while the players decide whether to start another round.`;
    }

    if (requesterMark === state.session.playerMark) {
      return "Your rematch request has been sent. The match will restart with a fresh countdown if the other player accepts.";
    }

    return `Player ${requesterMark} wants a rematch. Review the result and choose whether to accept or decline.`;
  }

  handleSummaryPrimaryAction() {
    if (!this.state) return;

    if (this.local) {
      this.action.handleButtonAction({ type: "REMATCH_REQUEST" });
      return;
    }

    const rematchRequest = this.state.session.rematchRequest;
    if (rematchRequest && rematchRequest.requesterMark !== this.state.session.playerMark) {
      this.action.handleButtonAction({ type: "REMATCH_ACCEPT" });
      return;
    }

    this.action.handleButtonAction({ type: "REMATCH_REQUEST" });
  }

  openSummaryModal() {
    this.summaryDismissed = false;
    this.renderSummaryModal(this.state);
  }

  getDisplayState(state) {
    const historyIndex = getHistoryIndex();
    const isHistoryMode = this.isHistoryMode(state);

    if (!isHistoryMode) {
      return state;
    }

    const board = state.boardHistory?.[historyIndex];
    if (!board) {
      return state;
    }

    return {
      ...state,
      game: {
        ...state.game,
        board,
        cyclePath: null,
        winningLine: null,
        nextAction: null
      }
    };
  }

  isHistoryMode(state) {
    const historyIndex = getHistoryIndex();
    const latestIndex = (state.boardHistory?.length ?? 0) - 1;
    return historyIndex != null && historyIndex >= 0 && historyIndex < latestIndex;
  }

  stepHistory(direction) {
    const state = this.state;
    if (!state) return;

    const totalPositions = state.boardHistory?.length ?? 0;
    if (totalPositions < 2) return;

    const latestIndex = totalPositions - 1;
    const currentIndex = getHistoryIndex() ?? latestIndex;
    const nextIndex = Math.max(0, Math.min(currentIndex + direction, latestIndex));

    if (nextIndex >= latestIndex) {
      setHistoryIndex(null);
      return;
    }

    setHistoryIndex(nextIndex);
  }

  startCountdownTick(countdownEndsAt) {
    this.stopCountdownTick();

    this.countdownTick = setInterval(() => {
      this.updateCountdown(countdownEndsAt);
    }, 200);
  }

  stopCountdownTick() {
    if (this.countdownTick) {
      clearInterval(this.countdownTick);
      this.countdownTick = null;
    }
  }

  updateCountdown(countdownEndsAt) {
    if (!countdownEndsAt) {
      this.statusOverlayCountdownEl.textContent = "";
      return;
    }

    const remainingMs = Math.max(0, countdownEndsAt - Date.now());
    const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    this.statusOverlayCountdownEl.textContent = `${seconds}`;
  }

  isCollapseChooser(state) {
    if (state.session.role === "spectator") return false;
    if (state.session.type === "local") return true;
    return state.session.playerMark === state.game.turn;
  }

  pushCollapseWaitToast(state) {
    const collapsingPlayer = state.game.turn === state.players.me.mark
      ? state.players.me.name
      : state.players.opponent.name;
    const message = `${collapsingPlayer} is choosing how the cycle collapses.`;

    if (getToastMessage() !== message) {
      setToastMessage(message);
    }
  }
}
