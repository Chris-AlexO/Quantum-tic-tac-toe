import {
  BOARD_SIZE,
  INNER_BOARD_SIZE,
  MATCH_START_DELAY_MS,
  RULESETS,
  TURN_SECONDS,
  WINNING_LINES
} from "../../shared/game/rulesEngine.js";

const C = {
  BOARD_SIZE,
  INNER_BOARD_SIZE,

  WINNING_LINES,

  PLAYER_MARKS: ["X", "O"],

  RULESETS,

  TIME: {
    TURN_SECONDS,
    MATCH_START_DELAY_MS,
    DISCONNECT_GRACE_MS: 30_000,
    TIMEOUT_WARNING_INTERVAL_MS: 1_000
  },

  ROOM_STATUS: {
    WAITING: "waiting",
    STARTING: "starting",
    PLAYING: "playing",
    FINISHED: "finished"
  },

  NEXT_ACTION: {
    MOVE: "move",
    COLLAPSE: "collapse",
    WINNER: "winner"
  },

  ACK_STATUS: {
    ERROR: "error",
    OK: "ok"
  }
};

export default C;
