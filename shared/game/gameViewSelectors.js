/**
 * @typedef {import("./types.js").GameSessionSnapshot} GameSessionSnapshot
 * @typedef {import("./types.js").RoomContextViewModel} RoomContextViewModel
 */
import { GAME_ACTIONS } from "./actions.js";

function createRoomContext(state, options = {}) {
  const room = selectRoomContext(state, options);

  return {
    roomType: room.roomType,
    banner: computeBannerState(state, room),
    me: buildPlayerState(state, "me", room),
    opponent: buildPlayerState(state, "opponent", room)
  };
}

function selectRoomContext(state, { local = false, roomType: roomTypeOverride = null } = {}) {
  const roomType = getRoomType(state, { local, roomTypeOverride });

  return {
    roomType,
    isLocal: roomType === "local",
    isMultiplayer: roomType === "mp",
    isPlayer: state?.session?.role === "player",
    isSpectator: state?.session?.role === "spectator"
  };
}

export function selectGameViewState(
  state,
  {
    local = false,
    summaryDismissed = false,
    lastSummaryKey = null,
    leavePromptOpen = false
  } = {}
) {
  const room = selectRoomContext(state, { local });
  const history = selectHistoryState(state);

  return {
    room,
    roomContext: createRoomContext(state, { roomType: room.roomType }),
    history,
    displayState: selectDisplayState(state, history),
    collapse: selectCollapseInteractionState(state, room),
    statusOverlay: selectStatusOverlayState(state, room),
    matchActions: selectMatchActionsState(state, room),
    disconnectNotice: selectDisconnectNoticeState(state, room),
    leavePrompt: selectLeaveConfirmationState(state, room, { leavePromptOpen }),
    summary: selectSummaryModalState(state, room, {
      summaryDismissed,
      lastSummaryKey
    })
  };
}

function selectHistoryState(state) {
  const historyIndex = state?.ui?.historyIndex ?? null;
  const totalPositions = state?.boardHistory?.length ?? 0;
  const latestIndex = totalPositions - 1;
  const displayIndex = historyIndex ?? latestIndex;
  const isHistoryMode = historyIndex != null && historyIndex >= 0 && historyIndex < latestIndex;

  return {
    historyIndex,
    totalPositions,
    latestIndex,
    displayIndex,
    isHistoryMode,
    isVisible: totalPositions >= 2,
    canGoPrev: displayIndex > 0,
    canGoNext: isHistoryMode,
    canGoLive: isHistoryMode
  };
}

function selectDisplayState(state, historyState = selectHistoryState(state)) {
  if (!historyState.isHistoryMode) {
    return state;
  }

  const board = state.boardHistory?.[historyState.historyIndex];
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

function selectSummaryModalState(
  state,
  roomContext = selectRoomContext(state),
  { summaryDismissed = false, lastSummaryKey = null } = {}
) {
  const summaryKey = getSummaryKey(state);
  const isAvailable = Boolean(summaryKey);
  const shouldResetDismissed = Boolean(summaryKey) && summaryKey !== lastSummaryKey;
  const effectiveDismissed = shouldResetDismissed ? false : summaryDismissed;

  if (!isAvailable) {
    return {
      isAvailable: false,
      resultState: "none",
      summaryKey: null,
      shouldResetDismissed: false,
      isVisible: false,
      showLauncher: false,
      metaItems: [],
      actions: {
        hidden: true,
        primary: createHiddenButtonState(),
        secondary: createHiddenButtonState()
      }
    };
  }

  const rematchRequest = selectRequestByType(state, "rematch");

  return {
    isAvailable: true,
    resultState: getSummaryResultState(state, rematchRequest),
    summaryKey,
    shouldResetDismissed,
    isVisible: !effectiveDismissed,
    showLauncher: effectiveDismissed,
    metaItems: buildSummaryMetaItems(state, roomContext),
    actions: {
      hidden: roomContext.isSpectator,
      primary: getSummaryPrimaryAction(state, roomContext, rematchRequest),
      secondary: getSummarySecondaryAction(state, rematchRequest)
    }
  };
}

function selectMatchActionsState(state, roomContext = selectRoomContext(state)) {
  const activeRequest = selectActiveMatchRequest(state);
  const isPlaying = state.session.status === "playing";
  const canRequestDuringPlay =
    roomContext.isPlayer &&
    roomContext.isMultiplayer &&
    isPlaying &&
    !activeRequest;

  const isVisible =
    roomContext.isPlayer &&
    roomContext.isMultiplayer &&
    isPlaying &&
    (canRequestDuringPlay || Boolean(activeRequest));

  if (!isVisible) {
    return {
      isVisible: false,
      requestState: "none",
      buttons: {
        draw: createHiddenButtonState(GAME_ACTIONS.DRAW_REQUEST),
        restart: createHiddenButtonState(GAME_ACTIONS.REMATCH_REQUEST),
        accept: createHiddenButtonState(GAME_ACTIONS.REMATCH_ACCEPT),
        decline: createHiddenButtonState(GAME_ACTIONS.REMATCH_DECLINE)
      }
    };
  }

  const isIncoming =
    Boolean(activeRequest) && activeRequest.requesterMark !== state.session.playerMark;
  const responseActions = getRequestResponseActions(activeRequest);

  return {
    isVisible: true,
    requestState: getMatchRequestState(activeRequest, isIncoming),
    buttons: {
      draw: createButtonState(GAME_ACTIONS.DRAW_REQUEST, { hidden: !canRequestDuringPlay }),
      restart: createButtonState(GAME_ACTIONS.REMATCH_REQUEST, { hidden: !canRequestDuringPlay }),
      accept: createButtonState(responseActions.accept, { hidden: !isIncoming }),
      decline: createButtonState(responseActions.decline, { hidden: !isIncoming })
    }
  };
}

function selectDisconnectNoticeState(state, roomContext = selectRoomContext(state)) {
  const disconnectState = state?.session?.disconnectState;
  const isVisible =
    roomContext.isMultiplayer &&
    roomContext.isPlayer &&
    Boolean(disconnectState) &&
    state.session.status !== "finished" &&
    disconnectState.disconnectedMark !== state.session.playerMark;

  if (!isVisible) {
    return {
      isVisible: false,
      noticeState: "none",
      secondsRemaining: 0
    };
  }

  const secondsRemaining = getDisconnectSecondsRemaining(disconnectState);
  return {
    isVisible: true,
    noticeState: "opponent_disconnected",
    secondsRemaining
  };
}

function selectStatusOverlayState(state, roomContext = selectRoomContext(state)) {
  const { session, players } = state;

  if (session.status === "waiting") {
    if (roomContext.isLocal) {
      return {
        isVisible: true,
        overlayState: "local_waiting",
        countdownEndsAt: null,
        actions: {
          primary: createButtonState(GAME_ACTIONS.START_GAME),
          secondary: createButtonState(GAME_ACTIONS.SKIP_COUNTDOWN)
        }
      };
    }

    if (roomContext.isSpectator) {
      return {
        isVisible: true,
        overlayState: "spectator_joining",
        countdownEndsAt: null,
        actions: createHiddenOverlayActions()
      };
    }

    if (isOpponentUnavailable(players.opponent)) {
      return {
        isVisible: true,
        overlayState: "waiting_for_opponent",
        countdownEndsAt: null,
        actions: createHiddenOverlayActions()
      };
    }

    return {
      isVisible: true,
      overlayState: "players_connected",
      countdownEndsAt: null,
      actions: {
        primary: createButtonState(GAME_ACTIONS.START_GAME),
        secondary: createHiddenButtonState()
      }
    };
  }

  if (session.status === "starting") {
    return {
      isVisible: true,
      overlayState: roomContext.isLocal ? "local_starting" : "match_starting",
      countdownEndsAt: session.countdownEndsAt,
      actions: {
        primary: createHiddenButtonState(),
        secondary: roomContext.isLocal
          ? createButtonState(GAME_ACTIONS.SKIP_COUNTDOWN)
          : createHiddenButtonState()
      }
    };
  }

  return {
    isVisible: false,
    overlayState: "none",
    countdownEndsAt: null,
    actions: createHiddenOverlayActions()
  };
}

function selectLeaveConfirmationState(
  state,
  roomContext = selectRoomContext(state),
  { leavePromptOpen = false } = {}
) {
  const shouldConfirm =
    roomContext.isMultiplayer &&
    roomContext.isPlayer &&
    ["waiting", "starting", "playing"].includes(state.session.status) &&
    hasNamedOpponent(state.players.opponent);

  return {
    shouldConfirm,
    confirmationState: shouldConfirm ? "forfeit_required" : "none",
    isVisible: leavePromptOpen && shouldConfirm
  };
}

function selectCollapseInteractionState(state, roomContext = selectRoomContext(state)) {
  const isCollapseChooser =
    !roomContext.isSpectator &&
    (roomContext.isLocal || state.session.playerMark === state.game.turn);
  const shouldToastCollapseWait =
    state.game.nextAction === "collapse" &&
    !isCollapseChooser &&
    !roomContext.isSpectator;
  const collapsingPlayer =
    state.game.turn === state.players.me.mark
      ? state.players.me.name
      : state.players.opponent.name;

  return {
    isCollapseChooser,
    chooserState: isCollapseChooser ? "active_collapse_chooser" : "waiting_for_collapse_chooser",
    shouldToastCollapseWait,
    collapsingPlayer
  };
}

function selectActiveMatchRequest(state) {
  return selectRequestByType(state, "draw") ?? selectRequestByType(state, "rematch");
}

function getRoomType(state, { local = false, roomTypeOverride = null } = {}) {
  return roomTypeOverride ?? state?.session?.type ?? (local ? "local" : "mp");
}

function hasNamedOpponent(opponent) {
  return Boolean(opponent?.name) && opponent.connectionStatus !== "offline";
}

function isOpponentUnavailable(opponent) {
  return !hasNamedOpponent(opponent) || opponent.connectionStatus === "offline";
}

function selectRequestByType(state, type) {
  const request = type === "draw" ? state.session.drawRequest : state.session.rematchRequest;
  return request ? { ...request, type } : null;
}

function getMatchRequestState(activeRequest, isIncoming) {
  if (!activeRequest) {
    return "none";
  }

  const direction = isIncoming ? "incoming" : "outgoing";
  return `${direction}_${activeRequest.type}_request`;
}

function getSummaryResultState(state, rematchRequest = null) {
  if (isIncomingRequest(state, rematchRequest)) {
    return "incoming_rematch_request";
  }

  if (isOutgoingRequest(state, rematchRequest)) {
    return "outgoing_rematch_request";
  }

  if (state.game.winner === "draw") {
    return "draw";
  }

  return state.session.playerMark === state.game.winner ? "player_won" : "player_lost";
}

function getSummaryKey(state) {
  if (state.session.status !== "finished") {
    return null;
  }

  return `${state.session.roomId}:${state.game.winner}:${JSON.stringify(state.game.winningLine ?? [])}`;
}

function buildSummaryMetaItems(state, roomContext) {
  return [
    {
      type: "mode",
      valueState: roomContext.isLocal ? "local" : roomContext.isSpectator ? "spectating" : "live"
    },
    {
      type: "result",
      valueState: state.game.winner ?? "unknown"
    }
  ];
}

function getSummaryPrimaryAction(state, roomContext, rematchRequest = null) {
  if (roomContext.isSpectator) {
    return createHiddenButtonState();
  }

  if (rematchRequest) {
    return isOutgoingRequest(state, rematchRequest)
      ? createButtonState(null, { disabled: true })
      : createButtonState(GAME_ACTIONS.REMATCH_ACCEPT);
  }

  return createButtonState(roomContext.isLocal ? GAME_ACTIONS.REMATCH : GAME_ACTIONS.REMATCH_REQUEST);
}

function getSummarySecondaryAction(state, rematchRequest = null) {
  return isIncomingRequest(state, rematchRequest)
    ? createButtonState(GAME_ACTIONS.REMATCH_DECLINE)
    : createHiddenButtonState();
}

function createButtonState(actionType = null, { hidden = false, disabled = false } = {}) {
  return {
    hidden,
    disabled,
    actionType
  };
}

function createHiddenButtonState(actionType = null) {
  return createButtonState(actionType, { hidden: true, disabled: true });
}

function createHiddenOverlayActions() {
  return {
    primary: createHiddenButtonState(),
    secondary: createHiddenButtonState()
  };
}

function getRequestResponseActions(request) {
  return request?.type === "draw"
    ? { accept: GAME_ACTIONS.DRAW_ACCEPT, decline: GAME_ACTIONS.DRAW_DECLINE }
    : { accept: GAME_ACTIONS.REMATCH_ACCEPT, decline: GAME_ACTIONS.REMATCH_DECLINE };
}

function isIncomingRequest(state, request) {
  return Boolean(request) && request.requesterMark !== state.session.playerMark;
}

function isOutgoingRequest(state, request) {
  return Boolean(request) && request.requesterMark === state.session.playerMark;
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

function buildPlayerState(state, slot, room) {
  const player = state.players[slot];
  const activeMark = state.game.turn;

  return {
    slot,
    roleState: computePlayerRoleState(state, slot, room),
    name: player.name,
    connectionStatus: player.connectionStatus,
    showConnectionStatus: !room.isLocal,
    secondsRemaining: player.time,
    timerState: player.mark === activeMark ? "active" : "idle",
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

function createBannerState(
  bannerState,
  {
    activeMark = null,
    tone = "neutral",
    emphasized = false,
    ...extraState
  } = {}
) {
  return {
    bannerState,
    activeMark,
    tone,
    emphasized,
    ...extraState
  };
}

function computeBannerState(state, room) {
  const historyIndex = state.ui.historyIndex;
  const totalPositions = state.boardHistory?.length ?? 0;

  if (historyIndex != null && totalPositions > 0) {
    return createBannerState("history", {
      historyIndex,
      totalPositions,
      tone: "waiting",
      emphasized: false
    });
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
      return computeWaitingBannerState(state, room);
    case "starting":
      return createBannerState("match_starting", { tone: "starting" });
    case "playing":
      return computePlayingBannerState(state, room);
    default:
      return createBannerState("none");
  }
}

function computeWaitingBannerState(state, room) {
  if (state.session.role === "spectator") {
    return createBannerState("spectator_waiting", { tone: "spectator" });
  }

  return createBannerState(room.isLocal ? "local_waiting" : "waiting_for_opponent", {
    tone: "waiting"
  });
}

function computePlayingBannerState(state, room) {
  const activeRequestBanner = computeActiveRequestBannerState(state);
  if (activeRequestBanner) {
    return activeRequestBanner;
  }

  if (state.game.nextAction === "collapse") {
    return computeTurnActionBannerState(state, room, {
      spectatorState: "spectator_collapse",
      localState: "local_collapse",
      selfState: "your_collapse",
      opponentState: "opponent_collapse"
    });
  }

  if (state.game.nextAction === "move") {
    return computeTurnActionBannerState(state, room, {
      spectatorState: "spectator_turn",
      localState: "local_turn",
      selfState: "your_turn",
      opponentState: "opponent_turn"
    });
  }

  return createBannerState("none");
}

function computeActiveRequestBannerState(state) {
  const activeRequest = selectActiveMatchRequest(state);

  if (!activeRequest) {
    return null;
  }

  if (state.session.role === "spectator") {
    return createBannerState(
      activeRequest.type === "draw" ? "draw_request_pending" : "rematch_request_pending",
      { tone: "spectator" }
    );
  }

  const isOutgoing = isOutgoingRequest(state, activeRequest);
  return createBannerState(`${isOutgoing ? "outgoing" : "incoming"}_${activeRequest.type}_request`, {
    activeMark: state.session.playerMark,
    tone: isOutgoing ? "waiting" : toneForMark(state.session.playerMark),
    emphasized: !isOutgoing
  });
}

function computeTurnActionBannerState(
  state,
  room,
  { spectatorState, localState, selfState, opponentState }
) {
  const activeMark = state.game.turn;

  if (state.session.role === "spectator") {
    return createBannerState(spectatorState, {
      activeMark,
      activePlayerName: activePlayerName(state),
      tone: toneForMark(activeMark),
      emphasized: false
    });
  }

  if (room.isLocal) {
    return createBannerState(localState, {
      activeMark,
      tone: toneForMark(activeMark),
      emphasized: true
    });
  }

  return state.session.playerMark === activeMark
    ? createBannerState(selfState, {
      activeMark,
      tone: toneForMark(state.session.playerMark),
      emphasized: true
    })
    : createBannerState(opponentState, {
        activeMark,
        tone: toneForMark(activeMark),
        emphasized: false
    });
}

function computeFinishedBannerState(state) {
  const rematchRequest = selectRequestByType(state, "rematch");
  if (rematchRequest) {
    if (state.session.role === "spectator") {
      return createBannerState("rematch_request_pending", { tone: "spectator" });
    }

    const isOutgoing = isOutgoingRequest(state, rematchRequest);
    return createBannerState(isOutgoing ? "outgoing_rematch_request" : "incoming_rematch_request", {
      activeMark: state.session.playerMark,
      tone: isOutgoing ? "waiting" : toneForMark(state.session.playerMark),
      emphasized: !isOutgoing
    });
  }

  if (state.game.winner === "draw") {
    return createBannerState("draw");
  }

  if (state.session.role === "spectator") {
    return createBannerState("spectator_winner", {
      activeMark: state.game.winner,
      tone: toneForMark(state.game.winner),
      emphasized: false
    });
  }

  if (state.session.type === "local") {
    return createBannerState("local_winner", {
      activeMark: state.game.winner,
      tone: toneForMark(state.game.winner),
      emphasized: false
    });
  }

  return state.game.winner === state.session.playerMark
    ? createBannerState("player_won", {
        activeMark: state.session.playerMark,
        tone: toneForMark(state.session.playerMark)
      })
    : createBannerState("player_lost", {
        activeMark: state.game.winner,
        tone: toneForMark(state.game.winner)
      });
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
    return createBannerState("spectator_disconnected", {
      activeMark: disconnectedMark,
      secondsRemaining,
      tone: "waiting",
      emphasized: false
    });
  }

  if (disconnectedMark === state.session.playerMark) {
    return createBannerState("self_disconnected", {
      activeMark: disconnectedMark,
      secondsRemaining,
      tone: toneForMark(disconnectedMark),
      emphasized: true
    });
  }

  return createBannerState("opponent_disconnected", {
    activeMark: disconnectedMark,
    secondsRemaining,
    tone: toneForMark(disconnectedMark),
    emphasized: true
  });
}

function computePlayerRoleState(state, slot, room) {
  if (room.isLocal || room.isSpectator) {
    return slot === "me" ? "player_x" : "player_o";
  }

  return slot === "me" ? "self" : "opponent";
}

function activePlayerName(state) {
  return state.players.me.mark === state.game.turn
    ? state.players.me.name
    : state.players.opponent.name;
}

function toneForMark(mark) {
  if (mark === "X") return "mark-x";
  if (mark === "O") return "mark-o";
  if (mark === "spectator") return "spectator";
  if (mark === "waiting") return "waiting";
  if (mark === "starting") return "starting";
  return "neutral";
}
