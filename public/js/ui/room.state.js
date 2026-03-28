import { convertSeconds } from "../misc/utilities.js";

export default function buildRoomState(state, elements = {}, options = {}) {
  const context = createRoomContext(state, options);

  renderBanner(elements.mainText, context.banner);
  renderPlayerCardChrome(elements.me, context.me);
  renderPlayerCardChrome(elements.opp, context.opponent);
  renderPlayerCardTimer(elements.me, context.me);
  renderPlayerCardTimer(elements.opp, context.opponent);
}

export function renderRoomChromeState(state, elements = {}, options = {}) {
  const context = createRoomContext(state, options);

  renderBanner(elements.mainText, context.banner);
  renderPlayerCardChrome(elements.me, context.me);
  renderPlayerCardChrome(elements.opp, context.opponent);
}

export function renderRoomTimerState(state, elements = {}, options = {}) {
  const context = createRoomContext(state, options);

  renderPlayerCardTimer(elements.me, context.me);
  renderPlayerCardTimer(elements.opp, context.opponent);
}

function createRoomContext(state, options = {}) {
  const roomType = options.roomType ?? state.session.type;

  return {
    roomType,
    banner: computeBannerState(state, roomType),
    me: buildPlayerViewModel(state, "me", roomType),
    opponent: buildPlayerViewModel(state, "opponent", roomType)
  };
}

function buildPlayerViewModel(state, slot, roomType) {
  const player = state.players[slot];
  const activeMark = state.game.turn;

  return {
    label: computePlayerLabel(state, slot, roomType),
    name: player.name,
    connectionStatus: `${computeStatusIcon(player.connectionStatus)} ${formatStatus(player.connectionStatus)}`,
    showConnectionStatus: roomType !== "local",
    time: `${computeTurnIcon(state, player.mark)} ${convertSeconds(player.time)}`,
    timerLabel: player.mark === activeMark ? "Active clock" : "Clock",
    mark: player.mark,
    tone: toneForMark(player.mark),
    isActive: state.session.status === "playing" && player.mark === activeMark,
    isWinner: state.session.status === "finished" && state.game.winner === player.mark,
    isDimmed:
      state.session.status === "finished" &&
      state.game.winner &&
      state.game.winner !== "draw" &&
      state.game.winner !== player.mark
  };
}

function renderBanner(element, bannerState) {
  if (!element || !bannerState) {
    return;
  }

  element.textContent = bannerState.text;
  element.dataset.tone = bannerState.tone;
  element.classList.toggle("is-emphasized", Boolean(bannerState.emphasized));
}

function renderPlayerCardChrome(elements, viewModel) {
  if (!elements || !viewModel) {
    return;
  }

  elements.root.dataset.tone = viewModel.tone;
  elements.root.classList.toggle("is-active", Boolean(viewModel.isActive));
  elements.root.classList.toggle("is-winner", Boolean(viewModel.isWinner));
  elements.root.classList.toggle("is-dimmed", Boolean(viewModel.isDimmed));

  setText(elements.badge, viewModel.mark);
  setText(elements.label, viewModel.label);
  setText(elements.name, viewModel.name);
  setText(elements.connectionStatus, viewModel.connectionStatus);
  setText(elements.mark, viewModel.mark);

  if (elements.connectionStatus) {
    elements.connectionStatus.hidden = !viewModel.showConnectionStatus;
  }
}

function renderPlayerCardTimer(elements, viewModel) {
  if (!elements || !viewModel) {
    return;
  }

  setText(elements.timerLabel, viewModel.timerLabel);
  setText(elements.time, viewModel.time);
}

function setText(element, value) {
  if (!element) {
    return;
  }
  element.textContent = value;
}

function computeBannerState(state, roomType) {
  const historyIndex = state.ui.historyIndex;
  const totalPositions = state.boardHistory?.length ?? 0;
  if (historyIndex != null && totalPositions > 0) {
    return {
      text: `Reviewing position ${historyIndex + 1} of ${totalPositions}`,
      tone: "waiting",
      emphasized: false
    };
  }

  const disconnectBannerState = computeDisconnectBannerState(state);
  if (disconnectBannerState) {
    return disconnectBannerState;
  }

  if (state.session.status === "finished" || state.game.nextAction === "winner") {
    return computeFinishedBannerState(state);
  }

  switch (state.session.status) {
    case "waiting":
      return computeWaitingBannerState(state, roomType);
    case "starting":
      return { text: "Match starting", tone: "starting", emphasized: false };
    case "playing":
      return computePlayingBannerState(state, roomType);
    default:
      return { text: "", tone: "neutral", emphasized: false };
  }
}

function computeWaitingBannerState(state, roomType) {
  if (state.session.role === "spectator") {
    return { text: "Watching live match", tone: "spectator", emphasized: false };
  }

  return {
    text: roomType === "local" ? "Preparing local match" : "Waiting for opponent",
    tone: "waiting",
    emphasized: false
  };
}

function computePlayingBannerState(state, roomType) {
  const activeRequestBanner = computeActiveRequestBannerState(state);
  if (activeRequestBanner) {
    return activeRequestBanner;
  }

  if (state.game.nextAction === "collapse") {
    return computeCollapseBannerState(state, roomType);
  }

  if (state.game.nextAction === "move") {
    return computeMoveBannerState(state, roomType);
  }

  return { text: "", tone: "neutral", emphasized: false };
}

function computeActiveRequestBannerState(state) {
  const activeRequest = state.session.drawRequest
    ? { ...state.session.drawRequest, type: "draw" }
    : state.session.rematchRequest
      ? { ...state.session.rematchRequest, type: "rematch" }
      : null;

  if (!activeRequest) {
    return null;
  }

  const outgoingText = activeRequest.type === "draw" ? "Draw requested" : "Restart requested";
  const incomingText = activeRequest.type === "draw" ? "Respond to draw" : "Respond to restart";

  if (state.session.role === "spectator") {
    return {
      text: activeRequest.type === "draw" ? "Draw request pending" : "Restart request pending",
      tone: "spectator",
      emphasized: false
    };
  }

  return activeRequest.requesterMark === state.session.playerMark
    ? { text: outgoingText, tone: "waiting", emphasized: false }
    : { text: incomingText, tone: toneForMark(state.session.playerMark), emphasized: true };
}

function computeMoveBannerState(state, roomType) {
  const activeMark = state.game.turn;

  if (state.session.role === "spectator") {
    return {
      text: `${activePlayerName(state)}'s turn`,
      tone: toneForMark(activeMark),
      emphasized: false
    };
  }

  if (roomType === "local") {
    return {
      text: `Player ${activeMark}'s turn`,
      tone: toneForMark(activeMark),
      emphasized: true
    };
  }

  return state.session.playerMark === activeMark
    ? { text: "Your turn", tone: toneForMark(state.session.playerMark), emphasized: true }
    : { text: "Opponent's turn", tone: toneForMark(activeMark), emphasized: false };
}

function computeCollapseBannerState(state, roomType) {
  const activeMark = state.game.turn;

  if (state.session.role === "spectator") {
    return {
      text: `${activePlayerName(state)} resolving collapse`,
      tone: toneForMark(activeMark),
      emphasized: false
    };
  }

  if (roomType === "local") {
    return {
      text: `Player ${activeMark} choosing collapse`,
      tone: toneForMark(activeMark),
      emphasized: true
    };
  }

  return state.session.playerMark === activeMark
    ? {
        text: "Choose collapse symbol",
        tone: toneForMark(state.session.playerMark),
        emphasized: true
      }
    : {
        text: "Opponent resolving collapse",
        tone: toneForMark(activeMark),
        emphasized: false
      };
}

function computeFinishedBannerState(state) {
  const rematchRequest = state.session.rematchRequest;
  if (rematchRequest) {
    if (state.session.role === "spectator") {
      return { text: "Rematch request pending", tone: "spectator", emphasized: false };
    }

    return rematchRequest.requesterMark === state.session.playerMark
      ? { text: "Rematch requested", tone: "waiting", emphasized: false }
      : {
          text: "Respond to rematch",
          tone: toneForMark(state.session.playerMark),
          emphasized: true
        };
  }

  if (state.game.winner === "draw") {
    return { text: "Draw game", tone: "neutral", emphasized: false };
  }

  if (state.session.role === "spectator") {
    return {
      text: `${state.game.winner} won`,
      tone: toneForMark(state.game.winner),
      emphasized: false
    };
  }

  if (state.session.type === "local") {
    return {
      text: `Player ${state.game.winner} won`,
      tone: toneForMark(state.game.winner),
      emphasized: false
    };
  }

  return state.game.winner === state.session.playerMark
    ? { text: "You won", tone: toneForMark(state.session.playerMark), emphasized: false }
    : { text: "You lost", tone: toneForMark(state.game.winner), emphasized: false };
}

function computeDisconnectBannerState(state) {
  const disconnectState = state.session.disconnectState;
  if (!disconnectState || state.session.status === "finished") {
    return null;
  }

  const disconnectedMark = disconnectState.disconnectedMark;
  if (!disconnectedMark) {
    return null;
  }

  const secondsRemaining = getDisconnectSecondsRemaining(disconnectState);
  if (state.session.role === "spectator") {
    return {
      text: `Player ${disconnectedMark} disconnected · ${secondsRemaining}s to return`,
      tone: "waiting",
      emphasized: false
    };
  }

  if (disconnectedMark === state.session.playerMark) {
    return {
      text: `Reconnecting · ${secondsRemaining}s before forfeit`,
      tone: toneForMark(disconnectedMark),
      emphasized: true
    };
  }

  return {
    text: `Opponent disconnected · ${secondsRemaining}s to return`,
    tone: toneForMark(disconnectedMark),
    emphasized: true
  };
}

function getDisconnectSecondsRemaining(disconnectState) {
  if (Number.isFinite(disconnectState?.secondsRemaining)) {
    return Math.max(0, disconnectState.secondsRemaining);
  }

  if (!disconnectState?.expiresAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((disconnectState.expiresAt - Date.now()) / 1000));
}

function computePlayerLabel(state, slot, roomType) {
  if (roomType === "local" || state.session.role === "spectator") {
    return slot === "me" ? "Player X" : "Player O";
  }

  return slot === "me" ? "You" : "Opponent";
}

function activePlayerName(state) {
  return state.players.me.mark === state.game.turn
    ? state.players.me.name
    : state.players.opponent.name;
}

function computeStatusIcon(status) {
  switch (status) {
    case "connected":
    case "online":
      return "●";
    case "offline":
      return "○";
    case "left":
      return "−";
    default:
      return "•";
  }
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function computeTurnIcon(state, mark) {
  if (state.session.status === "finished") {
    return state.game.winner === mark ? "★" : "◌";
  }

  return state.game.turn === mark ? "▶" : "○";
}

function toneForMark(mark) {
  if (mark === "X") return "mark-x";
  if (mark === "O") return "mark-o";
  return "neutral";
}
