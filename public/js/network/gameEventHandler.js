import { on } from "./bus.js";
import {
  getMark,
  getState,
  handleServerStateUpdate,
  setRematchPrompt,
  setToastMessage,
} from "../game/state.js";
import { withAck } from "./withAck.js";

export function createGameEventHandler() {
  const applyServerState = (serverState, mark = getMark(), role = getState().session.role) => {
    if (!serverState) return;

    handleServerStateUpdate(serverState, mark, role);

    const nextState = getState();
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

  const offConnect = on("net:connect", async () => {
    try {
      const ack = await withAck("resumeOrHello", {});
      if (ack?.status === "ok" && ack.state && ack.mark) {
        applyServerState(ack.state, ack.mark);
      }
    } catch (error) {
      console.warn("Unable to resume multiplayer session", error);
    }
  });

  const offRoomReady = on("room:ready", data => {
    const { state, mark } = data;
    if (state && mark) {
      applyServerState(state, mark);
    }
  });

  const offRoomStarting = on("room:starting", data => {
    const { state } = data;
    if (state) {
      applyServerState(state, getMark(), getState().session.role);
    }
  });

  const offRoomState = on("room:state", data => {
    const { state } = data;
    if (state) {
      applyServerState(state, getMark(), getState().session.role);
    }
  });

  const offCycleFound = on("room:cycle", data => {
    const { state } = data;
    if (state) {
      applyServerState(state, getMark(), getState().session.role);
    }
  });

  const offDrawRequested = on("room:draw:requested", data => {
    applyServerState(data?.state, getMark(), getState().session.role);

    const liveState = getState();
    if (liveState.session.role === "spectator") {
      return;
    }

    const requesterMark = data?.requesterMark ?? liveState.session.drawRequest?.requesterMark;
    if (!requesterMark) {
      return;
    }

    const isOutgoing = liveState.session.playerMark === requesterMark;
    setToastMessage(
      isOutgoing
        ? "Draw request sent. Waiting for the other player to respond."
        : "Draw request received. Respond from the match actions panel."
    );
  });

  const offDrawStatus = on("room:draw:status", data => {
    applyServerState(data?.state, getMark(), getState().session.role);

    if (data?.status === "accepted") {
      setToastMessage("Draw accepted. The match has been recorded as a draw.");
      return;
    }

    if (data?.status === "declined") {
      setToastMessage("Draw request declined.");
    }
  });

  const offRematchRequested = on("room:rematch:requested", data => {
    applyServerState(data?.state, getMark(), getState().session.role);

    const liveState = getState();
    if (liveState.session.role === "spectator") {
      return;
    }

    const requesterMark = data?.requesterMark ?? liveState.session.rematchRequest?.requesterMark;
    if (!requesterMark) {
      return;
    }

    const isOutgoing = liveState.session.playerMark === requesterMark;
    setToastMessage(
      isOutgoing
        ? data?.phase === "playing"
          ? "Restart request sent. Waiting for the other player to respond."
          : "Rematch request sent. Waiting for the other player to respond."
        : data?.phase === "playing"
          ? "Restart request received. Respond from the match actions panel."
          : "Rematch request received. Open the match summary to accept or decline."
    );
  });

  const offRematchStatus = on("room:rematch:status", data => {
    applyServerState(data?.state, getMark(), getState().session.role);
    setRematchPrompt(null);

    if (data?.status === "accepted") {
      setToastMessage(
        data?.phase === "playing"
          ? "Restart accepted. Starting a fresh round."
          : "Rematch accepted. Starting a fresh round."
      );
      return;
    }

    if (data?.status === "declined") {
      setToastMessage(data?.phase === "playing" ? "Restart request declined." : "Rematch declined.");
    }
  });

  const offPlayerOffline = on("player:offline", () => {});
  const offPlayerLeft = on("player:left", () => {});
  const offDisconnect = on("net:disconnect", ({ reason }) => {
    console.warn(`Disconnected from server: ${reason}`);
  });

  return () => {
    offConnect();
    offRoomReady();
    offRoomStarting();
    offRoomState();
    offCycleFound();
    offDrawRequested();
    offDrawStatus();
    offRematchRequested();
    offRematchStatus();
    offPlayerOffline();
    offPlayerLeft();
    offDisconnect();
  };
}
