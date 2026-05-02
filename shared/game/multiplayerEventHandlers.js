/**
 * @typedef {import("./types.js").GameSessionSnapshot} GameSessionSnapshot
 * @typedef {import("./types.js").SocketAck} SocketAck
 */

export function createMultiplayerEventHandlers({
  resumeSession,
  getSnapshot,
  applyServerState,
  setToastState,
  updateDisconnectState,
  setRematchPrompt,
  logWarn = () => {}
}) {
  let lastDisconnectToastKey = null;

  const syncRematchPrompt = () => {
    if (typeof setRematchPrompt !== "function") {
      return;
    }

    const nextState = getSnapshot();
    const rematchRequest = nextState.session.rematchRequest;
    if (!rematchRequest || nextState.session.role === "spectator") {
      setRematchPrompt(null);
      return;
    }

    setRematchPrompt({
      requesterMark: rematchRequest.requesterMark,
      direction:
        rematchRequest.requesterMark === nextState.session.playerMark ? "outgoing" : "incoming",
      requestedAt: rematchRequest.requestedAt
    });
  };

  const applyState = (
    serverState,
    mark = getSnapshot().session.playerMark,
    role = getSnapshot().session.role
  ) => {
    if (!serverState) {
      return;
    }

    applyServerState(serverState, mark, role);
    syncRematchPrompt();
  };

  async function onConnect() {
    try {
      const ack = await resumeSession?.();
      if (ack?.status === "ok" && ack.state && ack.mark) {
        applyState(ack.state, ack.mark);
      }
    } catch (error) {
      logWarn("Unable to resume multiplayer session", {
        message: error?.message ?? "Unknown error"
      });
    }
  }

  function onRoomReady(data, ack) {
    if (data?.state && data?.mark) {
      applyState(data.state, data.mark);
    }
    ack?.({ status: "ok" });
  }

  function onRoomStarting(data) {
    if (data?.state) {
      const state = getSnapshot();
      applyState(data.state, state.session.playerMark, state.session.role);
    }
  }

  function onRoomState(data) {
    if (data?.state) {
      const state = getSnapshot();
      applyState(data.state, state.session.playerMark, state.session.role);
    }
  }

  function onCycleFound(data) {
    if (data?.state) {
      const state = getSnapshot();
      applyState(data.state, state.session.playerMark, state.session.role);
    }
  }

  function onDrawRequested(data) {
    const state = getSnapshot();
    applyState(data?.state, state.session.playerMark, state.session.role);

    const liveState = getSnapshot();
    if (liveState.session.role === "spectator") {
      return;
    }

    const requesterMark = data?.requesterMark ?? liveState.session.drawRequest?.requesterMark;
    if (!requesterMark) {
      return;
    }

    const isOutgoing = liveState.session.playerMark === requesterMark;
    setToastState?.({
      toastState: isOutgoing ? "outgoing_draw_request" : "incoming_draw_request"
    });
  }

  function onDrawStatus(data) {
    const state = getSnapshot();
    applyState(data?.state, state.session.playerMark, state.session.role);

    if (data?.status === "accepted") {
      setToastState?.({ toastState: "draw_accepted" });
      return;
    }

    if (data?.status === "declined") {
      setToastState?.({ toastState: "draw_declined" });
    }
  }

  function onRematchRequested(data) {
    const state = getSnapshot();
    applyState(data?.state, state.session.playerMark, state.session.role);

    const liveState = getSnapshot();
    if (liveState.session.role === "spectator") {
      return;
    }

    const requesterMark = data?.requesterMark ?? liveState.session.rematchRequest?.requesterMark;
    if (!requesterMark) {
      return;
    }

    const isOutgoing = liveState.session.playerMark === requesterMark;
    setToastState?.({
      toastState: `${isOutgoing ? "outgoing" : "incoming"}_${data?.phase === "playing" ? "restart" : "rematch"}_request`,
      phase: data?.phase ?? null
    });
  }

  function onRematchStatus(data) {
    const state = getSnapshot();
    applyState(data?.state, state.session.playerMark, state.session.role);
    setRematchPrompt?.(null);

    if (data?.status === "accepted") {
      setToastState?.({
        toastState: data?.phase === "playing" ? "restart_accepted" : "rematch_accepted",
        phase: data?.phase ?? null
      });
      return;
    }

    if (data?.status === "declined") {
      setToastState?.({
        toastState: data?.phase === "playing" ? "restart_declined" : "rematch_declined",
        phase: data?.phase ?? null
      });
    }
  }

  function onPlayerOffline(data) {
    const liveState = getSnapshot();
    if (liveState.session.role !== "player") {
      return;
    }

    if (!data?.mark || data.mark === liveState.session.playerMark) {
      return;
    }

    updateDisconnectState({
      disconnectedMark: data.mark,
      expiresAt: data.expiresAt ?? null
    });

    const toastKey = `${data.mark}:${data.expiresAt ?? "unknown"}`;
    if (lastDisconnectToastKey !== toastKey) {
      lastDisconnectToastKey = toastKey;
      setToastState?.({
        toastState: "opponent_disconnected",
        mark: data.mark,
        expiresAt: data.expiresAt ?? null
      });
    }
  }

  function onPlayerTimeoutWarning(data) {
    const liveState = getSnapshot();
    if (liveState.session.role !== "player") {
      return;
    }

    if (!data?.mark || data.mark === liveState.session.playerMark) {
      return;
    }

    updateDisconnectState({
      disconnectedMark: data.mark,
      expiresAt: data.expiresAt ?? null,
      secondsRemaining: data.secondsRemaining ?? null
    });
  }

  function onPlayerLeft(data) {
    const liveState = getSnapshot();
    if (liveState.session.role === "spectator") {
      return;
    }

    if (data?.winnerMark && data.winnerMark === liveState.session.playerMark) {
      setToastState?.({
        toastState: data.reason === "disconnect"
          ? "opponent_disconnect_forfeit_win"
          : "opponent_forfeit_win",
        reason: data.reason ?? null
      });
      return;
    }

    if (data?.reason === "disconnect") {
      setToastState?.({ toastState: "disconnected_player_forfeited" });
      return;
    }

    setToastState?.({ toastState: "player_left" });
  }

  function onDisconnect(reason) {
    logWarn("Disconnected from server", { reason });
  }

  return {
    onConnect,
    onRoomReady,
    onRoomStarting,
    onRoomState,
    onCycleFound,
    onDrawRequested,
    onDrawStatus,
    onRematchRequested,
    onRematchStatus,
    onPlayerOffline,
    onPlayerTimeoutWarning,
    onPlayerLeft,
    onDisconnect
  };
}
