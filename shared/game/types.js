/**
 * @typedef {"X" | "O"} PlayerMark
 * @typedef {"house" | "goff"} Ruleset
 * @typedef {"waiting" | "starting" | "playing" | "finished"} RoomStatus
 * @typedef {"local" | "mp"} RoomType
 * @typedef {"player" | "spectator"} RoomRole
 * @typedef {"move" | "collapse" | "winner" | null} NextAction
 */

/**
 * @typedef {Array<string | null> | string | null} BoardCell
 * @typedef {BoardCell[]} GameBoard
 * @typedef {[number, string]} CollapseStep
 */

/**
 * @typedef {Object} PlayerSnapshot
 * @property {string} name
 * @property {string} connectionStatus
 * @property {number} time
 * @property {PlayerMark} mark
 */

/**
 * @typedef {Object} ServerPlayerSnapshot
 * @property {string=} playerId
 * @property {string=} name
 * @property {string=} connectionStatus
 * @property {number=} timeLeft
 */

/**
 * @typedef {Object} GameStateSnapshot
 * @property {GameBoard | null} board
 * @property {CollapseStep[] | null} cyclePath
 * @property {CollapseStep[] | null} collapseChoices
 * @property {PlayerMark | null} turn
 * @property {PlayerMark | "draw" | null} winner
 * @property {number[][] | null} winningLine
 * @property {NextAction} nextAction
 */

/**
 * @typedef {Object} MatchRequestSnapshot
 * @property {PlayerMark} requesterMark
 * @property {string | number=} requestedAt
 */

/**
 * @typedef {Object} DisconnectStateSnapshot
 * @property {PlayerMark} disconnectedMark
 * @property {number | null=} expiresAt
 * @property {number | null=} secondsRemaining
 */

/**
 * @typedef {Object} SessionSnapshot
 * @property {string | null} roomId
 * @property {boolean} roomReady
 * @property {RoomStatus} status
 * @property {boolean | string | null} host
 * @property {RoomType | null} type
 * @property {Ruleset | null} ruleset
 * @property {number | null} countdownEndsAt
 * @property {DisconnectStateSnapshot | null} disconnectState
 * @property {RoomRole} role
 * @property {PlayerMark | null} playerMark
 * @property {MatchRequestSnapshot | null} rematchRequest
 * @property {MatchRequestSnapshot | null} drawRequest
 */

/**
 * @typedef {Object} GameUiSnapshot
 * @property {{w: number, h: number}} viewport
 * @property {string | null} toastMessage
 * @property {string | null} modalMessage
 * @property {string | null} view
 * @property {Object | null} rematchPrompt
 * @property {number | null} historyIndex
 */

/**
 * @typedef {Object} GameSessionSnapshot
 * @property {SessionSnapshot} session
 * @property {{me: PlayerSnapshot, opponent: PlayerSnapshot}} players
 * @property {number | null} timeInterval
 * @property {GameStateSnapshot} game
 * @property {GameBoard[]} boardHistory
 * @property {GameUiSnapshot} ui
 */

/**
 * @typedef {Object} ServerRoomSnapshot
 * @property {Object} session
 * @property {{X?: ServerPlayerSnapshot, O?: ServerPlayerSnapshot}} players
 * @property {GameStateSnapshot} game
 * @property {GameBoard[]=} boardHistory
 */

/**
 * @typedef {Object} SocketAck
 * @property {"ok" | "error" | "occupied" | "nogame" | "hello" | "confirm_forfeit" | string} status
 * @property {string=} message
 * @property {string=} roomId
 * @property {PlayerMark | null=} mark
 * @property {RoomRole=} role
 * @property {ServerRoomSnapshot=} state
 */

/**
 * @typedef {Object} RoomContextViewModel
 * @property {RoomType} roomType
 * @property {Object} banner
 * @property {Object} me
 * @property {Object} opponent
 */

export {};
