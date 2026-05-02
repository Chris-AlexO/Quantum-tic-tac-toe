import { test } from "node:test";
import assert from "node:assert/strict";

import { GAME_ACTIONS } from "../shared/game/actions.js";
import { selectGameViewModel } from "../client/src/view-models/game/gameViewModel.js";

function createBaseState() {
  return {
    session: {
      roomId: "room-1",
      roomReady: true,
      status: "playing",
      host: true,
      type: "mp",
      ruleset: "house",
      countdownEndsAt: null,
      disconnectState: null,
      role: "player",
      playerMark: "O",
      rematchRequest: null,
      drawRequest: null
    },
    players: {
      me: {
        name: "Chris",
        connectionStatus: "connected",
        time: 590,
        mark: "O"
      },
      opponent: {
        name: "Alex",
        connectionStatus: "connected",
        time: 600,
        mark: "X"
      }
    },
    game: {
      board: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null)),
      cyclePath: null,
      collapseChoices: null,
      turn: "X",
      winner: null,
      winningLine: null,
      nextAction: "move"
    },
    boardHistory: [],
    ui: {
      viewport: { w: 1280, h: 720 },
      toastMessage: null,
      modalMessage: null,
      view: null,
      rematchPrompt: null,
      historyIndex: null
    }
  };
}

test("selectGameViewModel keeps opponent turn tone aligned to the active mark for player O", () => {
  const state = createBaseState();

  const { roomContext: context } = selectGameViewModel(state);

  assert.equal(context.banner.text, "Opponent's turn");
  assert.equal(context.banner.tone, "mark-x");
  assert.equal(context.me.label, "You");
  assert.equal(context.opponent.label, "Opponent");
});

test("selectGameViewModel swaps in the historical board and clears live-only board state", () => {
  const state = createBaseState();
  const historicalBoard = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
  historicalBoard[0][0] = "X1";
  const liveBoard = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
  liveBoard[1][0] = "O1";

  state.boardHistory = [historicalBoard, liveBoard];
  state.ui.historyIndex = 0;
  state.game.board = liveBoard;
  state.game.cyclePath = [[0, "X1"]];
  state.game.winningLine = [[1, 2, 3]];
  state.game.nextAction = "collapse";

  const { viewState } = selectGameViewModel(state);

  assert.equal(viewState.history.isHistoryMode, true);
  assert.equal(viewState.displayState.game.board, historicalBoard);
  assert.equal(viewState.displayState.game.cyclePath, null);
  assert.equal(viewState.displayState.game.winningLine, null);
  assert.equal(viewState.displayState.game.nextAction, null);
});

test("selectGameViewModel exposes incoming restart response actions during multiplayer play", () => {
  const state = createBaseState();
  state.session.rematchRequest = {
    requesterMark: "X",
    requestedAt: Date.now()
  };

  const { viewState } = selectGameViewModel(state);

  assert.equal(viewState.matchActions.isVisible, true);
  assert.equal(viewState.matchActions.requestState, "incoming_rematch_request");
  assert.equal(viewState.matchActions.buttons.accept.hidden, false);
  assert.equal(viewState.matchActions.buttons.accept.actionType, GAME_ACTIONS.REMATCH_ACCEPT);
  assert.equal(viewState.matchActions.buttons.decline.hidden, false);
  assert.equal(viewState.matchActions.buttons.draw.hidden, true);
  assert.equal(viewState.matchActions.buttons.restart.hidden, true);
});
