import test from "node:test";
import assert from "node:assert/strict";

import { handleLocalMove } from "../client/src/game/localGameReducer.js";
import { createLocalRuntimeStore } from "../client/src/game/localGameState.js";
import { createBoard } from "../shared/game/localGameDomain.js";

function createLocalPlayingState() {
  const board = createBoard();
  return {
    session: {
      status: "playing",
      ruleset: "house"
    },
    game: {
      board,
      turn: "X",
      nextAction: "move",
      cyclePath: null,
      collapseChoices: null
    },
    boardHistory: [board]
  };
}

test("local move reducer applies the first half of a quantum move", () => {
  const runtime = createLocalRuntimeStore();
  const state = createLocalPlayingState();
  let published = null;

  const result = handleLocalMove({
    state,
    cellIndex: 0,
    runtime,
    publish(nextState) {
      published = nextState;
    }
  });

  assert.equal(result, "MOVE");
  assert.equal(runtime.moves.length, 1);
  assert.deepEqual(runtime.symbolIndex.get("X1"), [0]);
  assert.equal(published.game.board[0][0], "X1");
  assert.equal(published.boardHistory.length, 2);
});
