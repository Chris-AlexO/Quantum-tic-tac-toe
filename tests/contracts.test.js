import test from "node:test";
import assert from "node:assert/strict";

import { GAME_ACTIONS } from "../shared/game/actions.js";
import { SOCKET_EVENTS } from "../shared/game/events.js";

test("socket event constants preserve public wire names", () => {
  assert.equal(SOCKET_EVENTS.CREATE_ROOM, "createRoom");
  assert.equal(SOCKET_EVENTS.JOIN_READY_ROOM, "joinReadyRoom");
  assert.equal(SOCKET_EVENTS.ROOM_STATE_UPDATED, "roomStateUpdated");
  assert.equal(SOCKET_EVENTS.REMATCH_REQUEST, "rematchRequest");
  assert.equal(SOCKET_EVENTS.DRAW_STATUS, "drawStatus");
});

test("game action constants preserve client command names", () => {
  assert.equal(GAME_ACTIONS.BOARD_CELL_CLICK, "BOARD_CELL_CLICK");
  assert.equal(GAME_ACTIONS.JOIN_MATCH, "JOIN_MATCH");
  assert.equal(GAME_ACTIONS.LOCAL_RESTART, "LOCAL_RESTART");
  assert.equal(GAME_ACTIONS.REMATCH_ACCEPT, "REMATCH_ACCEPT");
  assert.equal(GAME_ACTIONS.DRAW_DECLINE, "DRAW_DECLINE");
});
