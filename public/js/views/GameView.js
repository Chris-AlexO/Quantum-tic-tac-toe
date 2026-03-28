import { View } from "./View.js";
import { createRoomView, renderGameBoard } from "../render.js";
import { createButton } from "./dom/createButton.js";
import { MatchActionsPanel } from "./components/panels/MatchActionsPanel.js";
import { SummaryModal } from "./components/panels/SummaryModal.js";
import { HistoryPanel } from "./components/panels/HistoryPanel.js";
import { LeavePromptPanel } from "./components/panels/LeavePromptPanel.js";
import { DisconnectNoticePanel } from "./components/panels/DisconnectNoticePanel.js";
import { StatusOverlayPanel } from "./components/panels/StatusOverlayPanel.js";
import { CollapseReviewPanel } from "./components/panels/CollapseReviewPanel.js";
import {
  getTimeInterval,
  getToastMessage,
  handleServerStateUpdate,
  setHistoryIndex,
  setTimeInterval,
  setToastMessage,
} from "../game/state.js";
import { SoundManager } from "../SoundManager.js";
import { createSliceRenderer } from "./state/createSliceRenderer.js";
import {
  selectGameViewState,
  selectHistoryState,
  selectMatchActionsState,
  selectRoomContext,
  selectSummaryModalState,
  selectLeaveConfirmationState
} from "./selectors/gameViewSelectors.js";

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
    this.toastEl = document.createElement("div");
    this.roomView = null;
    this.matchActionsPanel = null;
    this.summaryModal = null;
    this.historyPanel = null;
    this.leavePromptPanel = null;
    this.disconnectNoticePanel = null;
    this.statusOverlayPanel = null;
    this.collapseReviewPanel = null;

    this.rematchBtn = null;
    this.leaveBtn = null;
    this.localRestartBtn = null;
    this.countdownTick = null;
    this.toastTimeout = null;

    this.lastSummaryKey = null;
    this.summaryDismissed = false;
    this.leavePromptOpen = false;
    this.sliceRenderers = null;

    this.sounds = new SoundManager();
  }

  async mount(root) {
    super.mount(root);

    this.container.classList.add("game-view");
    this.controlsEl.classList.add("game-controls");
    this.contentEl.classList.add("game-content");
    this.boardWrapEl.classList.add("game-board-wrap");
    this.toastEl.classList.add("game-toast");
    this.roomView = createRoomView();
    this.initializeSliceRenderers();
    this.statusOverlayPanel = new StatusOverlayPanel();
    this.summaryModal = new SummaryModal({
      onOpen: () => {
        this.openSummaryModal();
      },
      onClose: () => {
        this.summaryDismissed = true;
        this.summaryModal.render(this.getCurrentSummaryState());
      },
      onPrimary: () => {
        this.handleSummaryPrimaryAction();
      },
      onSecondary: () => {
        this.action.handleButtonAction({ type: "REMATCH_DECLINE" });
      },
      signal: this.domListenersAbort.signal
    });
    this.collapseReviewPanel = new CollapseReviewPanel();
    this.historyPanel = new HistoryPanel({
      onPrev: () => {
        this.stepHistory(-1);
      },
      onNext: () => {
        this.stepHistory(1);
      },
      onLive: () => {
        setHistoryIndex(null);
      },
      signal: this.domListenersAbort.signal
    });
    this.disconnectNoticePanel = new DisconnectNoticePanel();
    this.leavePromptPanel = new LeavePromptPanel({
      onStay: () => {
        this.leavePromptOpen = false;
        this.leavePromptPanel.render(this.getCurrentLeaveConfirmationState());
      },
      onForfeit: () => {
        this.leavePromptOpen = false;
        this.leavePromptPanel.render(this.getCurrentLeaveConfirmationState());
        this.action.handleButtonAction({ type: "LEAVE_GAME", forfeit: true });
      },
      signal: this.domListenersAbort.signal
    });
    this.matchActionsPanel = new MatchActionsPanel({
      onRequestDraw: () => {
        this.action.handleButtonAction({ type: "DRAW_REQUEST" });
      },
      onRequestRestart: () => {
        this.action.handleButtonAction({ type: "REMATCH_REQUEST" });
      },
      onAccept: () => {
        const actionType = this.getCurrentMatchActionsState().buttons.accept.actionType;
        if (!actionType) return;
        this.action.handleButtonAction({ type: actionType });
      },
      onDecline: () => {
        const actionType = this.getCurrentMatchActionsState().buttons.decline.actionType;
        if (!actionType) return;
        this.action.handleButtonAction({ type: actionType });
      },
      signal: this.domListenersAbort.signal
    });

    this.contentEl.append(this.roomView.root, this.boardWrapEl);
    this.container.append(
      this.controlsEl,
      this.contentEl,
      this.statusOverlayPanel.root,
      this.toastEl,
      this.summaryModal.root,
      this.collapseReviewPanel.root
    );

    if (!this.local) {
      this.controlsEl.append(this.disconnectNoticePanel.root);
    }

    this.leaveBtn = this.buildInteractiveButton("Leave Game", () => {
      this.handleLeaveRequest();
    }, "game-action-button");
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
    this.controlsEl.append(this.historyPanel.root);
    if (!this.local) {
      this.controlsEl.append(this.matchActionsPanel.root, this.leavePromptPanel.root);
    }

    if (this.local) {
      await this.localGame.hydrateOrStart();
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
    const viewState = selectGameViewState(state, {
      local: this.local,
      summaryDismissed: this.summaryDismissed,
      lastSummaryKey: this.lastSummaryKey,
      leavePromptOpen: this.leavePromptOpen
    });
    const context = { viewState };

    this.sliceRenderers.board.update(state, context);
    this.sliceRenderers.roomChrome.update(state, context);
    this.sliceRenderers.roomTimers.update(state, context);
    this.sliceRenderers.controls.update(state, context);
    this.sliceRenderers.statusOverlay.update(state, context);
    this.sliceRenderers.matchActions.update(state, context);
    this.sliceRenderers.disconnectNotice.update(state, context);
    this.sliceRenderers.leavePrompt.update(state, context);
    this.sliceRenderers.toast.update(state, context);
    this.sliceRenderers.summary.update(state, context);
    this.sliceRenderers.history.update(state, context);
    this.sliceRenderers.collapseReview.update(state, context);

    if (viewState.collapse.shouldToastCollapseWait) {
      this.pushCollapseWaitToast(viewState.collapse.waitToastMessage);
    }
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

    Object.values(this.sliceRenderers ?? {}).forEach(renderer => renderer.reset?.());

    super.unmount(root);
  }

  buildActionButton(label, action) {
    return this.buildInteractiveButton(label, () => {
      this.action.handleButtonAction(action);
    }, "game-action-button");
  }

  buildInteractiveButton(label, onClick, className = "game-action-button") {
    return createButton({
      label,
      className,
      onClick,
      signal: this.domListenersAbort.signal
    });
  }

  renderStatusOverlay(viewModel) {
    if (!viewModel?.isVisible) {
      this.statusOverlayPanel.render(viewModel);
      this.stopCountdownTick();
      return;
    }

    this.statusOverlayPanel.render(viewModel);

    if (viewModel.countdownEndsAt) {
      this.updateCountdown(viewModel.countdownEndsAt);
      this.startCountdownTick(viewModel.countdownEndsAt);
    } else {
      this.statusOverlayPanel.setCountdownText("");
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

  renderMatchActions(viewModel) {
    if (this.localRestartBtn) {
      this.localRestartBtn.hidden = this.state.session.status === "waiting";
    }

    this.matchActionsPanel?.render(viewModel);
  }

  renderSummary(viewModel) {
    if (!viewModel?.isAvailable) {
      this.lastSummaryKey = null;
      this.summaryDismissed = false;
      this.summaryModal.render(viewModel);
      return;
    }

    if (viewModel.shouldResetDismissed) {
      this.summaryDismissed = false;
    }

    this.lastSummaryKey = viewModel.summaryKey;
    this.summaryModal.render(viewModel);
  }

  handleSummaryPrimaryAction() {
    if (!this.state) return;
    const actionType = this.getCurrentSummaryState().actions.primary.actionType;
    if (!actionType) {
      return;
    }

    this.action.handleButtonAction({ type: actionType });
  }

  openSummaryModal() {
    this.summaryDismissed = false;
    this.renderSummary(this.getCurrentSummaryState());
  }

  handleLeaveRequest() {
    const leaveConfirmationState = this.getCurrentLeaveConfirmationState();

    if (leaveConfirmationState.shouldConfirm) {
      this.leavePromptOpen = true;
      this.leavePromptPanel.render({
        ...leaveConfirmationState,
        isVisible: true
      });
      return;
    }

    this.action.handleButtonAction({ type: "LEAVE_GAME" });
  }

  getCurrentRoomContext() {
    return selectRoomContext(this.state, { local: this.local });
  }

  getCurrentSummaryState() {
    return selectSummaryModalState(this.state, this.getCurrentRoomContext(), {
      summaryDismissed: this.summaryDismissed,
      lastSummaryKey: this.lastSummaryKey
    });
  }

  getCurrentLeaveConfirmationState() {
    return selectLeaveConfirmationState(this.state, this.getCurrentRoomContext(), {
      leavePromptOpen: this.leavePromptOpen
    });
  }

  getCurrentMatchActionsState() {
    return selectMatchActionsState(this.state, this.getCurrentRoomContext());
  }

  initializeSliceRenderers() {
    this.sliceRenderers = {
      board: createSliceRenderer({
        select: (state, context) => this.getBoardRenderKey(context.viewState),
        render: (_slice, state, context) => {
          this.renderBoardSection(state, context.viewState);
        }
      }),
      roomChrome: createSliceRenderer({
        select: (state, context) => this.getRoomChromeKey(state, context.viewState.room.roomType),
        render: (_slice, state, context) => {
          this.roomView.renderChrome(state, { roomType: context.viewState.room.roomType });
        }
      }),
      roomTimers: createSliceRenderer({
        select: state => this.getRoomTimerKey(state),
        render: (_slice, state, context) => {
          this.roomView.renderTimers(state, { roomType: context.viewState.room.roomType });
        }
      }),
      controls: createSliceRenderer({
        select: state => this.getControlsKey(state),
        render: (_slice, state) => {
          this.renderControls(state);
        }
      }),
      statusOverlay: createSliceRenderer({
        select: (_state, context) => this.getJsonKey(context.viewState.statusOverlay),
        render: (_slice, _state, context) => {
          this.renderStatusOverlay(context.viewState.statusOverlay);
        }
      }),
      matchActions: createSliceRenderer({
        select: (_state, context) => this.getJsonKey(context.viewState.matchActions),
        render: (_slice, _state, context) => {
          this.renderMatchActions(context.viewState.matchActions);
        }
      }),
      disconnectNotice: createSliceRenderer({
        select: (_state, context) => this.getJsonKey(context.viewState.disconnectNotice),
        render: (_slice, _state, context) => {
          this.disconnectNoticePanel?.render(context.viewState.disconnectNotice);
        }
      }),
      leavePrompt: createSliceRenderer({
        select: (_state, context) => this.getJsonKey(context.viewState.leavePrompt),
        render: (_slice, _state, context) => {
          this.leavePromptPanel?.render(context.viewState.leavePrompt);
        }
      }),
      toast: createSliceRenderer({
        select: state => state.ui.toastMessage,
        render: (_slice, state) => {
          this.renderToast(state);
        }
      }),
      summary: createSliceRenderer({
        select: (_state, context) => this.getJsonKey(context.viewState.summary),
        render: (_slice, _state, context) => {
          this.renderSummary(context.viewState.summary);
        }
      }),
      history: createSliceRenderer({
        select: (_state, context) => this.getJsonKey(context.viewState.history),
        render: (_slice, _state, context) => {
          this.historyPanel.render(context.viewState.history);
        }
      }),
      collapseReview: createSliceRenderer({
        select: () => "static-hidden",
        render: () => {
          this.collapseReviewPanel.render({ isVisible: false, title: "", body: "", items: [] });
        }
      })
    };
  }

  renderBoardSection(state, viewState) {
    const { svg, clickables } = renderGameBoard(viewState.displayState, {
      roomType: viewState.room.roomType,
      showCollapseChoices: viewState.collapse.isCollapseChooser && !viewState.history.isHistoryMode,
      collapseChooser: viewState.collapse.isCollapseChooser
    });

    clickables.forEach(clickable => {
      const { type, cellIndex, symbol, element } = clickable;

      if (clickable.hoverPreview) {
        element.addEventListener(
          "mouseenter",
          () => {
            this.applyCollapseHoverPreview(svg, clickable.hoverPreview);
          },
          { signal: this.domListenersAbort.signal }
        );

        element.addEventListener(
          "mouseleave",
          () => {
            this.clearCollapseHoverPreview(svg);
          },
          { signal: this.domListenersAbort.signal }
        );
      }

      element.addEventListener(
        "click",
        async () => {
          const liveState = this.state;
          const liveHistory = selectHistoryState(liveState);

          if (liveHistory.isHistoryMode) {
            setHistoryIndex(null);
            if (getToastMessage() !== "Returned to the live position.") {
              setToastMessage("Returned to the live position.");
            }
            return;
          }

          const outcome = await this.dispatch(liveState, { type, cellIndex, symbol });
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

    this.boardWrapEl.replaceChildren(svg);
  }

  renderControls(state) {
    if (this.rematchBtn) {
      this.rematchBtn.hidden =
        state.session.status !== "finished" || state.session.role === "spectator";
      this.rematchBtn.textContent = this.local ? "Play Again" : "Match summary";
    }

    if (this.localRestartBtn) {
      this.localRestartBtn.hidden = state.session.status === "waiting";
    }
  }

  getJsonKey(value) {
    return JSON.stringify(value ?? null);
  }

  getBoardRenderKey(viewState) {
    return this.getJsonKey({
      roomType: viewState.room.roomType,
      collapseChooser: viewState.collapse.isCollapseChooser,
      showCollapseChoices: viewState.collapse.isCollapseChooser && !viewState.history.isHistoryMode,
      historyIndex: viewState.history.historyIndex,
      board: viewState.displayState.game.board,
      cyclePath: viewState.displayState.game.cyclePath,
      collapseChoices: viewState.displayState.game.collapseChoices,
      nextAction: viewState.displayState.game.nextAction,
      winningLine: viewState.displayState.game.winningLine
    });
  }

  getRoomChromeKey(state, roomType) {
    return this.getJsonKey({
      roomType,
      sessionStatus: state.session.status,
      sessionRole: state.session.role,
      playerMark: state.session.playerMark,
      disconnectState: state.session.disconnectState,
      rematchRequest: state.session.rematchRequest,
      drawRequest: state.session.drawRequest,
      boardHistoryLength: state.boardHistory?.length ?? 0,
      historyIndex: state.ui.historyIndex,
      nextAction: state.game.nextAction,
      turn: state.game.turn,
      winner: state.game.winner,
      me: {
        name: state.players.me.name,
        connectionStatus: state.players.me.connectionStatus,
        mark: state.players.me.mark
      },
      opponent: {
        name: state.players.opponent.name,
        connectionStatus: state.players.opponent.connectionStatus,
        mark: state.players.opponent.mark
      }
    });
  }

  getRoomTimerKey(state) {
    return `${state.players.me.time}|${state.players.opponent.time}|${state.game.turn}|${state.session.status}`;
  }

  getControlsKey(state) {
    return `${state.session.status}|${state.session.role}|${this.local ? "local" : "mp"}`;
  }

  stepHistory(direction) {
    const state = this.state;
    if (!state) return;

    const historyState = selectHistoryState(state);
    if (!historyState.isVisible) return;

    const currentIndex = historyState.historyIndex ?? historyState.latestIndex;
    const nextIndex = Math.max(0, Math.min(currentIndex + direction, historyState.latestIndex));

    if (nextIndex >= historyState.latestIndex) {
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
      this.statusOverlayPanel.setCountdownText("");
      return;
    }

    const remainingMs = Math.max(0, countdownEndsAt - Date.now());
    const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    this.statusOverlayPanel.setCountdownText(`${seconds}`);
  }

  applyCollapseHoverPreview(svg, preview) {
    this.clearCollapseHoverPreview(svg);
    if (!preview) {
      return;
    }

    const symbolKeys = new Set(preview.symbolKeys ?? []);
    const lineSymbols = new Set(preview.lineSymbols ?? []);

    svg.querySelectorAll(".quantum-symbol").forEach(node => {
      const symbolKey = `${node.dataset.cellIndex}:${node.dataset.symbol}`;
      if (!symbolKeys.has(symbolKey)) {
        if (node.classList.contains("collapse-choice-symbol")) {
          node.classList.add("collapse-rest-choice-symbol");
        } else {
          node.classList.add("collapse-rest-symbol");
        }
        return;
      }

      node.classList.add("collapse-preview-symbol");
      if (node.classList.contains("collapse-choice-symbol")) {
        node.classList.add("collapse-preview-choice-symbol");
      } else {
        node.classList.add("collapse-preview-auto-symbol");
      }
      if (symbolKey === preview.originKey) {
        node.classList.add("collapse-preview-origin-symbol");
      }
    });

    svg.querySelectorAll(".quantum-orbital").forEach(node => {
      const symbolKey = `${node.dataset.cellIndex}:${node.dataset.symbol}`;
      if (!symbolKeys.has(symbolKey)) {
        return;
      }

      node.classList.add("collapse-preview-orbital");
      if (symbolKey === preview.originKey) {
        node.classList.add("collapse-preview-origin-orbital");
      }
    });

    svg.querySelectorAll(".quantum-entanglement-line").forEach(node => {
      if (lineSymbols.has(node.dataset.symbol)) {
        node.classList.add("collapse-preview-line");
      }
    });
  }

  clearCollapseHoverPreview(svg) {
    svg.querySelectorAll(".collapse-preview-symbol").forEach(node => {
      node.classList.remove(
        "collapse-preview-symbol",
        "collapse-preview-choice-symbol",
        "collapse-preview-origin-symbol",
        "collapse-preview-auto-symbol",
        "collapse-rest-choice-symbol",
        "collapse-rest-symbol"
      );
    });

    svg.querySelectorAll(".collapse-rest-choice-symbol, .collapse-rest-symbol").forEach(node => {
      node.classList.remove("collapse-rest-choice-symbol", "collapse-rest-symbol");
    });

    svg.querySelectorAll(".collapse-preview-orbital").forEach(node => {
      node.classList.remove("collapse-preview-orbital", "collapse-preview-origin-orbital");
    });

    svg.querySelectorAll(".collapse-preview-line").forEach(node => {
      node.classList.remove("collapse-preview-line");
    });
  }

  pushCollapseWaitToast(message) {
    if (getToastMessage() !== message) {
      setToastMessage(message);
    }
  }
}
