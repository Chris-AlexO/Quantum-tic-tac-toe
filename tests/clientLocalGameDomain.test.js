import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildCollapseChoices,
  checkIfOneSquareRemains,
  checkWinner,
  RULESETS
} from "../shared/game/localGameDomain.js";

test("client local game domain uses Allan Goff tie-break when both players complete a line", () => {
  const board = [
    "X1", "X3", "X5",
    "O2", "O4", "O6",
    null, null, null
  ];

  const result = checkWinner(board, { ruleset: RULESETS.GOFF });

  assert.equal(result.winner, true);
  assert.equal(result.resolvedWinner, "X");
});

test("client local game domain includes both placements of each house-rules cycle symbol", () => {
  const board = [
    ["X1", "O2", null, null, null, null, null, null, null],
    ["X1", "X3", null, null, null, null, null, null, null],
    ["O2", "X3", null, null, null, null, null, null, null],
    Array.from({ length: 9 }, () => null),
    Array.from({ length: 9 }, () => null),
    Array.from({ length: 9 }, () => null),
    Array.from({ length: 9 }, () => null),
    Array.from({ length: 9 }, () => null),
    Array.from({ length: 9 }, () => null)
  ];

  const cyclePath = [
    [2, "X3"],
    [1, "X1"],
    [0, "O2"]
  ];

  const collapseChoices = buildCollapseChoices(
    board,
    cyclePath,
    RULESETS.HOUSE,
    [[2, "X3"]]
  );

  assert.deepEqual(
    collapseChoices,
    [
      [0, "X1"],
      [1, "X1"],
      [0, "O2"],
      [2, "O2"],
      [1, "X3"],
      [2, "X3"]
    ]
  );
});

test("client local game domain keeps the surviving token in the final Allan Goff square", () => {
  const board = [
    "X1",
    "O2",
    "X3",
    "O4",
    "X5",
    "O6",
    "X7",
    "O8",
    ["X9", "O9", null, null, null, null, null, null, null]
  ];

  const result = checkIfOneSquareRemains(board, "X", { ruleset: RULESETS.GOFF });

  assert.equal(result[8], "X9");
});
