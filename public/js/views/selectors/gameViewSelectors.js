export function selectRoomContext(state, { local = false } = {}) {
  const roomType = state?.session?.type ?? (local ? "local" : "mp");

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

export function selectHistoryState(state) {
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
    canGoLive: isHistoryMode,
    label: totalPositions < 2
      ? ""
      : isHistoryMode
        ? `Reviewing position ${displayIndex + 1} of ${totalPositions}`
        : `Live position ${displayIndex + 1} of ${totalPositions}`
  };
}

export function selectDisplayState(state, historyState = selectHistoryState(state)) {
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

export function selectSummaryModalState(
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
      summaryKey: null,
      shouldResetDismissed: false,
      isVisible: false,
      showLauncher: false,
      title: "",
      body: "",
      metaItems: [],
      actions: {
        hidden: true,
        primary: createHiddenButtonState(),
        secondary: createHiddenButtonState()
      }
    };
  }

  const rematchRequest = state.session.rematchRequest;
  const hasIncomingRequest =
    Boolean(rematchRequest) && rematchRequest.requesterMark !== state.session.playerMark;
  const hasOutgoingRequest =
    Boolean(rematchRequest) && rematchRequest.requesterMark === state.session.playerMark;

  return {
    isAvailable: true,
    summaryKey,
    shouldResetDismissed,
    isVisible: !effectiveDismissed,
    showLauncher: effectiveDismissed,
    title: state.game.winner === "draw" ? "Match complete" : `${state.game.winner} wins`,
    body: getSummaryBody(state),
    metaItems: buildSummaryMetaItems(state, roomContext),
    actions: {
      hidden: roomContext.isSpectator,
      primary: getSummaryPrimaryAction(state, roomContext, {
        hasIncomingRequest,
        hasOutgoingRequest
      }),
      secondary: getSummarySecondaryAction({ hasIncomingRequest })
    }
  };
}

export function selectMatchActionsState(state, roomContext = selectRoomContext(state)) {
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
      title: "",
      body: "",
      buttons: {
        draw: createHiddenButtonState("DRAW_REQUEST"),
        restart: createHiddenButtonState("REMATCH_REQUEST"),
        accept: createHiddenButtonState("REMATCH_ACCEPT"),
        decline: createHiddenButtonState("REMATCH_DECLINE")
      }
    };
  }

  const isIncoming = Boolean(activeRequest) && activeRequest.requesterMark !== state.session.playerMark;
  const requestLabel = activeRequest?.type === "draw" ? "draw" : "restart";

  return {
    isVisible: true,
    title: activeRequest
      ? activeRequest.type === "draw" ? "Draw request" : "Restart request"
      : "Match actions",
    body: activeRequest
      ? isIncoming
        ? `Your opponent wants a ${requestLabel}.`
        : `Your ${requestLabel} request has been sent.`
      : "Propose a draw or request a restart.",
    buttons: {
      draw: {
        hidden: !canRequestDuringPlay,
        disabled: false,
        label: "Request draw",
        actionType: "DRAW_REQUEST"
      },
      restart: {
        hidden: !canRequestDuringPlay,
        disabled: false,
        label: "Request restart",
        actionType: "REMATCH_REQUEST"
      },
      accept: {
        hidden: !isIncoming,
        disabled: false,
        label: activeRequest?.type === "draw" ? "Accept draw" : "Accept restart",
        actionType: activeRequest?.type === "draw" ? "DRAW_ACCEPT" : "REMATCH_ACCEPT"
      },
      decline: {
        hidden: !isIncoming,
        disabled: false,
        label: activeRequest?.type === "draw" ? "Decline draw" : "Decline restart",
        actionType: activeRequest?.type === "draw" ? "DRAW_DECLINE" : "REMATCH_DECLINE"
      }
    }
  };
}

export function selectDisconnectNoticeState(state, roomContext = selectRoomContext(state)) {
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
      title: "",
      body: ""
    };
  }

  const secondsRemaining = getDisconnectSecondsRemaining(disconnectState);
  return {
    isVisible: true,
    title: "Opponent disconnected",
    body: `They have ${secondsRemaining} seconds to reconnect before the match is forfeited in your favor.`
  };
}

export function selectStatusOverlayState(state, roomContext = selectRoomContext(state)) {
  const { session, players } = state;

  if (session.status === "waiting") {
    if (roomContext.isLocal) {
      return {
        isVisible: true,
        title: "Setting up local match",
        body: "Loading the board and player clocks.",
        countdownEndsAt: null
      };
    }

    if (roomContext.isSpectator) {
      return {
        isVisible: true,
        title: "Joining as spectator",
        body: "Loading the current board.",
        countdownEndsAt: null
      };
    }

    if (players.opponent.connectionStatus === "offline" || players.opponent.name === "Searching...") {
      return {
        isVisible: true,
        title: "Room created",
        body: "Waiting for another player to join.",
        countdownEndsAt: null
      };
    }

    return {
      isVisible: true,
      title: "Players connected",
      body: "Preparing the match.",
      countdownEndsAt: null
    };
  }

  if (session.status === "starting") {
    return {
      isVisible: true,
      title: roomContext.isLocal ? "Local match starting" : "Match starting",
      body: "Get ready.",
      countdownEndsAt: session.countdownEndsAt
    };
  }

  return {
    isVisible: false,
    title: "",
    body: "",
    countdownEndsAt: null
  };
}

export function selectLeaveConfirmationState(
  state,
  roomContext = selectRoomContext(state),
  { leavePromptOpen = false } = {}
) {
  const shouldConfirm =
    roomContext.isMultiplayer &&
    roomContext.isPlayer &&
    ["waiting", "starting", "playing"].includes(state.session.status) &&
    Boolean(state.players.opponent?.name) &&
    state.players.opponent.name !== "Searching...";

  return {
    shouldConfirm,
    isVisible: leavePromptOpen && shouldConfirm,
    title: "Leave this match?",
    body: "Leaving now will forfeit the game and award the win to your opponent."
  };
}

export function selectCollapseInteractionState(state, roomContext = selectRoomContext(state)) {
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
    shouldToastCollapseWait,
    waitToastMessage: `${collapsingPlayer} is choosing how the cycle collapses.`
  };
}

function selectActiveMatchRequest(state) {
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

function getSummaryKey(state) {
  if (state.session.status !== "finished") {
    return null;
  }

  return `${state.session.roomId}:${state.game.winner}:${JSON.stringify(state.game.winningLine ?? [])}`;
}

function getSummaryBody(state) {
  const rematchRequest = state.session.rematchRequest;

  if (state.game.winner === "draw") {
    return rematchRequest
      ? getRematchSummaryBody(state, rematchRequest)
      : "The game finished in a draw.";
  }

  if (state.session.role === "spectator") {
    return `Player ${state.game.winner} closed out the match.`;
  }

  if (rematchRequest) {
    return getRematchSummaryBody(state, rematchRequest);
  }

  const didWin = state.session.playerMark === state.game.winner;
  return didWin
    ? "Strong finish."
    : "The match has concluded.";
}

function getRematchSummaryBody(state, rematchRequest) {
  const requesterMark = rematchRequest.requesterMark;

  if (state.session.role === "spectator") {
    return `Player ${requesterMark} has requested a rematch.`;
  }

  if (requesterMark === state.session.playerMark) {
    return "Your rematch request has been sent.";
  }

  return `Player ${requesterMark} wants a rematch.`;
}

function buildSummaryMetaItems(state, roomContext) {
  const items = [
    { label: "Result", value: getResultLabel(state) },
    { label: "Phase", value: getPhaseLabel(state) },
    { label: "Rules", value: state.session.ruleset === "goff" ? "Allan Goff" : "House" }
  ];

  if (!roomContext.isLocal) {
    items.splice(
      2,
      0,
      { label: "Role", value: roomContext.isSpectator ? "Spectator" : "Player" },
      { label: "Room", value: "Live room" }
    );
  }

  return items;
}

function getResultLabel(state) {
  if (state.game.winner === "draw") {
    return "Draw";
  }

  return `Winner: ${state.game.winner}`;
}

function getPhaseLabel(state) {
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

function getSummaryPrimaryAction(state, roomContext, { hasIncomingRequest, hasOutgoingRequest }) {
  if (roomContext.isSpectator) {
    return createHiddenButtonState();
  }

  if (roomContext.isLocal) {
    return {
      hidden: false,
      disabled: false,
      label: "Play again",
      actionType: "REMATCH_REQUEST"
    };
  }

  if (hasIncomingRequest) {
    return {
      hidden: false,
      disabled: false,
      label: "Accept rematch",
      actionType: "REMATCH_ACCEPT"
    };
  }

  if (hasOutgoingRequest) {
    return {
      hidden: false,
      disabled: true,
      label: "Request sent",
      actionType: "REMATCH_REQUEST"
    };
  }

  return {
    hidden: false,
    disabled: false,
    label: "Request rematch",
    actionType: "REMATCH_REQUEST"
  };
}

function getSummarySecondaryAction({ hasIncomingRequest }) {
  return {
    hidden: !hasIncomingRequest,
    disabled: false,
    label: "Decline",
    actionType: "REMATCH_DECLINE"
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

function createHiddenButtonState(actionType = null) {
  return {
    hidden: true,
    disabled: false,
    label: "",
    actionType
  };
}
