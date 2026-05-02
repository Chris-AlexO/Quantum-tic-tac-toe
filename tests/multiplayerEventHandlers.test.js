import assert from "node:assert/strict";
import test from "node:test";

import { createMultiplayerEventHandlers } from "../shared/game/multiplayerEventHandlers.js";

function createState(overrides = {}) {
  return {
    session: {
      role: "player",
      playerMark: "X",
      drawRequest: null,
      rematchRequest: null,
      ...overrides.session
    }
  };
}

test("multiplayer event handlers emit semantic toast states", () => {
  const toastStates = [];
  let state = createState();
  const handlers = createMultiplayerEventHandlers({
    getSnapshot: () => state,
    applyServerState: () => {},
    setToastState: toast => toastStates.push(toast),
    updateDisconnectState: () => {}
  });

  handlers.onDrawRequested({ requesterMark: "O" });
  handlers.onRematchStatus({ status: "accepted", phase: "playing" });
  handlers.onPlayerOffline({ mark: "O", expiresAt: 123 });

  assert.deepEqual(toastStates, [
    { toastState: "incoming_draw_request" },
    { toastState: "restart_accepted", phase: "playing" },
    { toastState: "opponent_disconnected", mark: "O", expiresAt: 123 }
  ]);
});
