// game/constants.js


const C = {
  BOARD_SIZE: 9,
  INNER_BOARD_SIZE: 9,

  WINNING_LINES: [
    [1,2,3], [4,5,6], [7,8,9],
    [1,4,7], [2,5,8], [3,6,9],
    [1,5,9], [3,5,7]
  ],

  PLAYER_MARKS: ["X", "O"],

  RULESETS: {
    HOUSE: "house",
    GOFF: "goff"
  },

  TIME: {
    TURN_SECONDS: 600,
    MATCH_START_DELAY_MS: 3_000,
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
