const TOAST_COPY = {
  outgoing_draw_request: "Draw request sent.",
  incoming_draw_request: "Draw request received.",
  draw_accepted: "Draw accepted.",
  draw_declined: "Draw declined.",
  outgoing_restart_request: "Restart request sent.",
  incoming_restart_request: "Restart request received.",
  restart_accepted: "Restart accepted.",
  restart_declined: "Restart declined.",
  outgoing_rematch_request: "Rematch request sent.",
  incoming_rematch_request: "Rematch request received.",
  rematch_accepted: "Rematch accepted.",
  rematch_declined: "Rematch declined.",
  opponent_disconnect_forfeit_win: "Opponent forfeited.",
  opponent_forfeit_win: "Opponent forfeited.",
  disconnected_player_forfeited: "Disconnected player forfeited.",
  player_left: "A player left."
};

export function formatMultiplayerToast(toast) {
  if (!toast?.toastState) {
    return "";
  }

  if (toast.toastState === "opponent_disconnected") {
    return `${formatMark(toast.mark)} disconnected.`;
  }

  return TOAST_COPY[toast.toastState] ?? "";
}

function formatMark(mark) {
  if (mark === "X") return "Player X";
  if (mark === "O") return "Player O";
  return "Opponent";
}
