import { test } from "node:test";
import assert from "node:assert/strict";

import { checkWinner, updateBoard } from "../server/game/gameLogic.js";
import C from "../server/game/constants.js";
import Room from "../server/game/Room.js";
import Player from "../server/game/Player.js";
import RoomManager from "../server/game/RoomManager.js";

test("checkWinner detects row win", () => {
  const board = ["X","X","X", null,null,null, null,null,null];
  const res = checkWinner(board);
  assert.equal(res.winner, true);
});

test("updateBoard adds a symbol to the next open slot", () => {
  const board = {
    getBoardArray() {
      return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
    }
  };

  const result = updateBoard(board, 4, "X1");
  assert.equal(result[4][0], "X1");
});

test("room rejoin updates the stored socket id", () => {
  const playerX = new Player("player-x", "socket-1", "Chris", "X");
  const room = new Room({ playerX, type: "mp", host: playerX.playerId });

  const reconnectingPlayer = new Player("player-x", "socket-2", "Chris", "X");
  const mark = room.rejoinRoom(reconnectingPlayer);

  assert.equal(mark, "X");
  assert.equal(room.getPlayerSocketID("X"), "socket-2");
});

test("room rematch resets the game to a fresh playable state", () => {
  const playerX = new Player("player-x", "socket-1", "Chris", "X");
  const playerO = new Player("player-o", "socket-2", "Alex", "O");
  const room = new Room({ playerX, playerO, type: "mp", host: playerX.playerId });

  room.status = "finished";
  room.game.setWinner("X");
  room.game.setCyclePath([[0, "X1"]]);
  room.game.makeMove(0, "X1");
  room.clientReady.X = true;
  room.clientReady.O = true;

  room.rematchGame();

  assert.equal(room.getStatus(), "waiting");
  assert.equal(room.getGame().winner, null);
  assert.equal(room.getGame().nextAction, "move");
  assert.equal(room.getGame().getMoves().length, 0);
  assert.deepEqual(room.clientReady, { X: false, O: false });
  assert.equal(room.getRematchRequest(), null);
});

test("room stores rematch requests until the opponent responds", () => {
  const playerX = new Player("player-x", "socket-1", "Chris", "X");
  const playerO = new Player("player-o", "socket-2", "Alex", "O");
  const room = new Room({ playerX, playerO, type: "mp", host: playerX.playerId });

  room.status = "finished";

  const request = room.requestRematch("X");

  assert.equal(request.status, "ok");
  assert.equal(room.getRematchRequest()?.requesterMark, "X");

  const response = room.respondToRematch("O", false);

  assert.equal(response.status, "ok");
  assert.equal(response.accepted, false);
  assert.equal(room.getRematchRequest(), null);
});

test("only the opponent can answer a rematch request", () => {
  const playerX = new Player("player-x", "socket-1", "Chris", "X");
  const playerO = new Player("player-o", "socket-2", "Alex", "O");
  const room = new Room({ playerX, playerO, type: "mp", host: playerX.playerId });

  room.status = "finished";
  room.requestRematch("X");

  const response = room.respondToRematch("X", true);

  assert.equal(response.status, "error");
  assert.equal(room.getRematchRequest()?.requesterMark, "X");
});

test("room countdown moves match into starting state", () => {
  const playerX = new Player("player-x", "socket-1", "Chris", "X");
  const playerO = new Player("player-o", "socket-2", "Alex", "O");
  const room = new Room({ playerX, playerO, type: "mp", host: playerX.playerId });

  const started = room.beginCountdown(() => {}, 50);

  assert.equal(started, true);
  assert.equal(room.getStatus(), "starting");
  assert.ok(room.countdownEndsAt !== null);

  room.clearCountdown();
});

test("room accepts draw requests during play and finishes the match as a draw", () => {
  const playerX = new Player("player-x", "socket-1", "Chris", "X");
  const playerO = new Player("player-o", "socket-2", "Alex", "O");
  const room = new Room({ playerX, playerO, type: "mp", host: playerX.playerId });

  room.status = "playing";

  const request = room.requestDraw("X");
  const response = room.respondToDraw("O", true);

  assert.equal(request.status, "ok");
  assert.equal(response.status, "ok");
  assert.equal(response.accepted, true);
  assert.equal(room.getStatus(), "finished");
  assert.equal(room.getGame().winner, "draw");
  assert.equal(room.getDrawRequest(), null);
});

test("room manager only counts rooms of the requested type for capacity checks", () => {
  const manager = new RoomManager();
  const playerX = new Player("player-x", "socket-1", "Chris", "X");
  const playerY = new Player("player-y", "socket-2", "Alex", "X");

  manager.createRoom({ playerX, type: "mp", host: playerX.playerId });
  manager.createRoom({ playerX: playerY, type: "local", host: playerY.playerId });

  assert.equal(manager.getRoomCount({ type: "mp" }), 1);
  assert.equal(manager.getRoomCount({ type: "local" }), 1);
  assert.equal(manager.getRoomCount(), 2);
});

test("checkWinner uses Allan Goff tie-break when both players complete a line", () => {
  const board = [
    "X1", "X3", "X5",
    "O2", "O4", "O6",
    null, null, null
  ];

  const result = checkWinner(board, { ruleset: C.RULESETS.GOFF });

  assert.equal(result.winner, true);
  assert.equal(result.resolvedWinner, "X");
});
