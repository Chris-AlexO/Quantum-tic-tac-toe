import { GAME_ACTIONS } from "../../../../shared/game/actions.js";
import { selectGameViewState as selectRawGameViewState } from "../../../../shared/game/gameViewSelectors.js";

const BUTTON_LABELS = {
  [GAME_ACTIONS.DRAW_REQUEST]: "Request draw",
  [GAME_ACTIONS.REMATCH_REQUEST]: "Request restart",
  [GAME_ACTIONS.DRAW_ACCEPT]: "Accept draw",
  [GAME_ACTIONS.REMATCH_ACCEPT]: "Accept",
  [GAME_ACTIONS.DRAW_DECLINE]: "Decline draw",
  [GAME_ACTIONS.REMATCH_DECLINE]: "Decline",
  [GAME_ACTIONS.REMATCH]: "Play again",
  [GAME_ACTIONS.SKIP_COUNTDOWN]: "Skip countdown",
  [GAME_ACTIONS.START_GAME]: "Start game"
};

const MATCH_ACTION_TITLES = {
  incoming_draw_request: "Draw request",
  outgoing_draw_request: "Draw requested",
  incoming_rematch_request: "Restart request",
  outgoing_rematch_request: "Restart requested"
};

const STATUS_TITLES = {
  local_waiting: "Setting up local match",
  spectator_joining: "Joining as spectator",
  waiting_for_opponent: "Waiting for opponent",
  players_connected: "Players connected",
  local_starting: "Local match starting",
  match_starting: "Match starting"
};

export function selectGameViewModel(state, options = {}) {
  const raw = selectRawGameViewState(state, options);
  const { roomContext, ...viewState } = raw;

  return {
    viewState: applyViewCopy(viewState),
    roomContext: applyRoomCopy(roomContext)
  };
}

function applyViewCopy(viewState) {
  return {
    ...viewState,
    history: {
      ...viewState.history,
      label: historyLabel(viewState.history)
    },
    summary: applySummaryCopy(viewState.summary),
    matchActions: applyMatchActionsCopy(viewState.matchActions),
    disconnectNotice: applyDisconnectNoticeCopy(viewState.disconnectNotice),
    statusOverlay: {
      ...viewState.statusOverlay,
      title: STATUS_TITLES[viewState.statusOverlay.overlayState] ?? "",
      body: "",
      actions: {
        primary: applyButtonLabel(viewState.statusOverlay.actions.primary),
        secondary: applyButtonLabel(viewState.statusOverlay.actions.secondary)
      }
    },
    leavePrompt: {
      ...viewState.leavePrompt,
      title: viewState.leavePrompt.confirmationState === "forfeit_required" ? "Leave this match?" : "",
      body: viewState.leavePrompt.confirmationState === "forfeit_required" ? "Leaving forfeits the game." : ""
    },
    collapse: {
      ...viewState.collapse,
      waitToastMessage: `Waiting for ${viewState.collapse.collapsingPlayer}.`
    }
  };
}

function applyRoomCopy(roomContext) {
  return {
    ...roomContext,
    banner: {
      ...roomContext.banner,
      text: bannerText(roomContext.banner)
    },
    me: applyPlayerCopy(roomContext.me),
    opponent: applyPlayerCopy(roomContext.opponent)
  };
}

function applyPlayerCopy(player) {
  return {
    ...player,
    label: playerLabel(player.roleState),
    connectionStatus: `${statusIcon(player.connectionStatus)} ${capitalize(player.connectionStatus || "unknown")}`,
    time: `${turnIcon(player)} ${formatSeconds(player.secondsRemaining)}`,
    timerLabel: player.timerState === "active" ? "Active" : "Clock"
  };
}

function applySummaryCopy(summary) {
  return {
    ...summary,
    title: summaryTitle(summary),
    body: summary.resultState === "incoming_rematch_request"
      ? "Choose a response."
      : summary.resultState === "outgoing_rematch_request"
        ? "Waiting for response."
        : "",
    metaItems: [],
    actions: {
      ...summary.actions,
      primary: applyButtonLabel(summary.actions.primary),
      secondary: applyButtonLabel(summary.actions.secondary)
    }
  };
}

function applyMatchActionsCopy(matchActions) {
  return {
    ...matchActions,
    title: MATCH_ACTION_TITLES[matchActions.requestState] ?? "",
    body: "",
    buttons: Object.fromEntries(
      Object.entries(matchActions.buttons).map(([key, button]) => [key, applyButtonLabel(button)])
    )
  };
}

function applyDisconnectNoticeCopy(notice) {
  return {
    ...notice,
    title: notice.isVisible ? "Opponent disconnected" : "",
    body: notice.isVisible ? `${notice.secondsRemaining}s to reconnect.` : ""
  };
}

function applyButtonLabel(button) {
  return {
    ...button,
    label: button.actionType ? BUTTON_LABELS[button.actionType] ?? "" : button.disabled ? "Waiting" : ""
  };
}

function summaryTitle(summary) {
  if (!summary.isAvailable) {
    return "";
  }

  if (summary.resultState === "draw") {
    return "Draw";
  }

  if (summary.resultState === "player_won") {
    return "You won";
  }

  if (summary.resultState === "player_lost") {
    return "You lost";
  }

  return "Match complete";
}

function historyLabel(history) {
  if (history.totalPositions < 2) {
    return "Live position 1";
  }

  return history.isHistoryMode
    ? `Position ${history.displayIndex + 1} of ${history.totalPositions}`
    : `Live position ${history.displayIndex + 1}`;
}

function bannerText(banner) {
  switch (banner.bannerState) {
    case "history":
      return `Position ${banner.historyIndex + 1} of ${banner.totalPositions}`;
    case "waiting_for_opponent":
      return "Waiting for opponent";
    case "match_starting":
      return "Match starting";
    case "outgoing_draw_request":
      return "Draw requested";
    case "incoming_draw_request":
      return "Respond to draw";
    case "outgoing_rematch_request":
      return "Restart requested";
    case "incoming_rematch_request":
      return "Respond to restart";
    case "spectator_turn":
      return `${banner.activePlayerName}'s turn`;
    case "local_turn":
      return `Player ${banner.activeMark}'s turn`;
    case "your_turn":
      return "Your turn";
    case "opponent_turn":
      return "Opponent's turn";
    case "spectator_collapse":
      return `${banner.activePlayerName} resolving collapse`;
    case "local_collapse":
      return `Player ${banner.activeMark} choosing collapse`;
    case "your_collapse":
      return "Choose collapse symbol";
    case "opponent_collapse":
      return "Opponent resolving collapse";
    case "draw":
      return "Draw";
    case "spectator_winner":
    case "local_winner":
      return `${banner.activeMark} won`;
    case "player_won":
      return "You won";
    case "player_lost":
      return "You lost";
    case "spectator_disconnected":
      return `${banner.activeMark} disconnected`;
    case "self_disconnected":
      return "Reconnecting";
    case "opponent_disconnected":
      return "Opponent disconnected";
    default:
      return "";
  }
}

function playerLabel(roleState) {
  switch (roleState) {
    case "self":
      return "You";
    case "opponent":
      return "Opponent";
    case "player_x":
      return "Player X";
    case "player_o":
      return "Player O";
    default:
      return "";
  }
}

function statusIcon(status) {
  if (status === "connected" || status === "online") return "●";
  if (status === "offline") return "○";
  if (status === "left") return "−";
  return "•";
}

function turnIcon(player) {
  if (player.isWinner) return "★";
  if (player.isDimmed) return "◌";
  return player.timerState === "active" ? "▶" : "○";
}

function formatSeconds(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mm = Math.floor(safeSeconds / 60);
  const ss = safeSeconds % 60;

  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
