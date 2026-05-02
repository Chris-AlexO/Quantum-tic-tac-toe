import C from "./constants.js";

export function requestMatchAction(room, mark, {
  type,
  allowedStatuses = [],
  target = "request",
  pendingKey = type === "draw" ? "pendingDraw" : "pendingRematch"
} = {}) {
  if (!allowedStatuses.includes(room.status)) {
    return {
      status: "error",
      message: `${target.charAt(0).toUpperCase() + target.slice(1)} is not available right now`
    };
  }

  if (!["X", "O"].includes(mark)) {
    return { status: "error", message: "Only active players can send this request" };
  }

  const opponentMark = room.getOpponentMark(mark);
  if (!room.getPlayer(opponentMark)) {
    return { status: "error", message: "An opponent is required before sending this request" };
  }

  if (room.pendingDraw || room.pendingRematch) {
    const pendingRequest = room.pendingDraw || room.pendingRematch;
    if (pendingRequest.requesterMark === mark) {
      return { status: "error", message: `${target.charAt(0).toUpperCase() + target.slice(1)} already sent` };
    }

    return { status: "error", message: "Waiting for the current match request to be answered" };
  }

  room[pendingKey] = {
    requesterMark: mark,
    requestedAt: Date.now(),
    type,
    phase: room.status
  };

  return {
    status: "ok",
    requesterMark: mark,
    requestedAt: room[pendingKey].requestedAt,
    type,
    phase: room[pendingKey].phase
  };
}

export function requestRematch(room, mark) {
  return requestMatchAction(room, mark, {
    type: "rematch",
    allowedStatuses: [C.ROOM_STATUS.PLAYING, C.ROOM_STATUS.FINISHED],
    target: "restart request",
    pendingKey: "pendingRematch"
  });
}

export function requestDraw(room, mark) {
  return requestMatchAction(room, mark, {
    type: "draw",
    allowedStatuses: [C.ROOM_STATUS.PLAYING],
    target: "draw request",
    pendingKey: "pendingDraw"
  });
}

export function respondToMatchAction(room, mark, {
  type,
  accept,
  pendingRequest,
  clearPendingRequest
}) {
  if (!pendingRequest) {
    return { status: "error", message: `There is no ${type} request to respond to` };
  }

  const requesterMark = pendingRequest.requesterMark;
  const responderMark = room.getOpponentMark(requesterMark);

  if (mark !== responderMark) {
    return { status: "error", message: "Only the other player can answer this request" };
  }

  clearPendingRequest.call(room);

  return {
    status: "ok",
    requesterMark,
    responderMark,
    accepted: Boolean(accept),
    type,
    phase: pendingRequest.phase
  };
}

export function applyAcceptedDraw(room) {
  room.game.stopTimer();
  room.game.setWinner("draw");
  room.game.setWinningLine(null);
  room.game.setCyclePath(null);
  room.game.setNextAction("winner");
  room.status = C.ROOM_STATUS.FINISHED;
}

export function forfeitPlayer(room, mark, reason = "leave") {
  if (!["X", "O"].includes(mark)) {
    return { status: "error", message: "Only active players can forfeit" };
  }

  const winnerMark = room.getOpponentMark(mark);
  if (!winnerMark || !room.getPlayer(winnerMark)) {
    return { status: "error", message: "An opponent is required for a forfeit result" };
  }

  room.game.stopTimer();
  room.clearCountdown();
  room.clearPendingRequests();
  room.clearDisconnectState();
  room.game.setWinner(winnerMark);
  room.game.setNextAction("winner");
  room.game.setCyclePath(null);
  room.game.setCollapseChoices(null);
  room.status = C.ROOM_STATUS.FINISHED;

  return {
    status: "ok",
    winnerMark,
    loserMark: mark,
    reason
  };
}
