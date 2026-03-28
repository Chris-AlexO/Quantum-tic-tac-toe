import Player from "./Player.js";
import Game from "./Game.js";
import { v4 as uuidv4 } from "uuid";
import C from "./constants.js";

export default class Room {
    constructor(deps){

        this.roomId =  uuidv4();;
        this.roomName = deps?.roomName;
        this.type = deps?.type;
        this.host = deps?.host;
        this.ruleset = deps?.ruleset ?? C.RULESETS.HOUSE;

        this.players = {
            X: deps?.playerX ?? null,
            O: deps?.playerO ?? null,
            };

        this.clientReady = {
            X: false,
            O: false
        }

        this.spectators = new Set();

        this.status = C.ROOM_STATUS.WAITING;

        this.game = new Game(this.roomId);

        this.timeouts = {};
        this.timeoutIntervals = {};
        this.playerOfflineTimeout = {};
        this.countdownTimeout = null;
        this.countdownEndsAt = null;
        this.pendingRematch = null;
        this.pendingDraw = null;
        this.disconnectState = null;
    }

    startGame(onTimeout) {
    if (!this.players.X || !this.players.O) return false;
    if (!this.areBothPlayersReady()) return false;
    if (this.status === C.ROOM_STATUS.PLAYING) return false;

    this.clearCountdown();
    this.clearPendingRequests();
    this.clearDisconnectState();
    this.status = C.ROOM_STATUS.PLAYING;
    this.game.updateNextAction("MOVE");
    this.game.startTimer(() => {
        this.clearPendingRequests();
        this.clearDisconnectState();
        this.status = C.ROOM_STATUS.FINISHED;
        this.game.setNextAction("winner");
        this.game.setCyclePath(null);
        onTimeout?.();
    });
    return true;
    }

    endGame() {
        this.game.end(this.ruleset);
        this.status = C.ROOM_STATUS.FINISHED;
        }

    getPlayerSocketID(mark){
        return this.players[mark].getSocketID();
    }

    rejoinRoom(player) {
        if (!player) return null;

        if (this.players.X?.playerId === player.playerId) {
            this.players.X.setSocketID(player.getSocketID());
            this.players.X.setName(player.getName() || this.players.X.getName());
            this.players.X.setOnline();
            return "X";
        }

        if (this.players.O?.playerId === player.playerId) {
            this.players.O.setSocketID(player.getSocketID());
            this.players.O.setName(player.getName() || this.players.O.getName());
            this.players.O.setOnline();
            return "O";
        }

        return null;
        }

    rematchGame(){
        this.game.stopTimer();
        this.clearCountdown();
        this.clearPendingRequests();
        this.clearDisconnectState();
        this.game.reset();
        this.clientReady = {
            X: false,
            O: false
        };
        this.status = C.ROOM_STATUS.WAITING;
    }

    beginCountdown(onComplete, delayMs = C.TIME.MATCH_START_DELAY_MS) {
        if (this.status === C.ROOM_STATUS.PLAYING) return false;
        if (this.countdownTimeout) return false;

        this.status = C.ROOM_STATUS.STARTING;
        this.clearDisconnectState();
        this.countdownEndsAt = Date.now() + delayMs;
        this.countdownTimeout = setTimeout(() => {
            this.countdownTimeout = null;
            onComplete?.();
        }, delayMs);

        return true;
    }

    clearCountdown() {
        if (this.countdownTimeout) {
            clearTimeout(this.countdownTimeout);
            this.countdownTimeout = null;
        }
        this.countdownEndsAt = null;
    }

    getDisconnectState() {
        return this.disconnectState ? { ...this.disconnectState } : null;
    }

    setDisconnectState(mark, expiresAt) {
        this.disconnectState = {
            disconnectedMark: mark,
            expiresAt
        };
    }

    clearDisconnectState() {
        this.disconnectState = null;
    }

    isTimingOut(player){
        return this.timeouts[player.playerId] != null;
    }

    startTimeout(player, callback){
        if(this.timeouts[player.playerId] != null) return;
        this.timeouts[player.playerId] = setTimeout(() => {
            console.log(`${Date.now()} removing player ${player.playerId} (${player.getName()}) from room ${this.roomId}`);
            callback();
        }, C.TIME.DISCONNECT_GRACE_MS)
    }

    //Emits recurring warning to room about timed out user
    startTimeoutInterval(player, callback){
        if(this.timeoutIntervals[player.playerId] != null) return;
        this.timeoutIntervals[player.playerId] = setInterval(() => {
            callback();
            }, C.TIME.TIMEOUT_WARNING_INTERVAL_MS);
    }

    startPlayerOfflineTimeout(player, callback){
        if(this.playerOfflineTimeout[player.playerId]) return;
        this.playerOfflineTimeout[player.playerId] = setTimeout(()=>{
            callback()
        }, 5000)
    }

    endTimeout(player) {
        const id = player?.playerId;
        if (!id) return;

        clearTimeout(this.timeouts[id]);
        clearInterval(this.timeoutIntervals[id]);
        clearTimeout(this.playerOfflineTimeout[id]);

        delete this.timeouts[id];
        delete this.timeoutIntervals[id];
        delete this.playerOfflineTimeout[id];
        this.clearDisconnectState();
    }   

    getId(){
        return this.roomId;
    }

    getStatus(){
        return this.status;
    }

    getPlayers(){
        return this.players;
    }

    getPlayerX(){
        return this.players.X;
    }

    getPlayerO(){
        return this.players.O;
    }

    getPlayer(mark) {
        return this.players[mark] ?? null;
    }

    getGame(){
        return this.game;
    }

    getBoard(){
        return this.game.getBoard();
    }

    getRoomType(){
        return this.type;
    }

    getPlayerMark(player) {
        if (!player) return null;
        if (this.players.X?.playerId === player.playerId) return "X";
        if (this.players.O?.playerId === player.playerId) return "O";
        return null;
        }

    getOpponentMark(mark) {
        if (mark === "X") return "O";
        if (mark === "O") return "X";
        return null;
    }

    needSecondPlayer() {
        return this.players.O == null;
        }

    addSecondPlayer(player) {
        if (!player) return false;
        if (this.players.O) return false;

        player.mark = "O";
        this.players.O = player;
        this.clientReady.O = false;
        return true;
        }

    addSpectator(player){
        this.spectators.add(player);
    }

    readyPlayer(mark){
        this.clientReady[mark] = true;
    }

    areBothPlayersReady(){
        if(this.clientReady.O === true && this.clientReady.X === true){
            return true;
        }
        return false;
    }

    hasGameStarted(){
        return this.status === C.ROOM_STATUS.PLAYING;
    }

    getRematchRequest() {
        return this.pendingRematch ? { ...this.pendingRematch } : null;
    }

    getDrawRequest() {
        return this.pendingDraw ? { ...this.pendingDraw } : null;
    }

    clearRematchRequest() {
        this.pendingRematch = null;
    }

    clearDrawRequest() {
        this.pendingDraw = null;
    }

    clearPendingRequests() {
        this.clearRematchRequest();
        this.clearDrawRequest();
    }

    getPendingRequestOfType(type) {
        if (type === "rematch") {
            return this.pendingRematch;
        }

        if (type === "draw") {
            return this.pendingDraw;
        }

        return null;
    }

    requestMatchAction(mark, {
        type,
        allowedStatuses = [],
        target = "request",
        pendingKey = type === "draw" ? "pendingDraw" : "pendingRematch",
    } = {}) {
        if (!allowedStatuses.includes(this.status)) {
            return {
                status: "error",
                message: `${target.charAt(0).toUpperCase() + target.slice(1)} is not available right now`
            };
        }

        if (!["X", "O"].includes(mark)) {
            return { status: "error", message: "Only active players can send this request" };
        }

        const opponentMark = this.getOpponentMark(mark);
        if (!this.getPlayer(opponentMark)) {
            return { status: "error", message: "An opponent is required before sending this request" };
        }

        if (this.pendingDraw || this.pendingRematch) {
            const pendingRequest = this.pendingDraw || this.pendingRematch;
            if (pendingRequest.requesterMark === mark) {
                return { status: "error", message: `${target.charAt(0).toUpperCase() + target.slice(1)} already sent` };
            }

            return { status: "error", message: "Waiting for the current match request to be answered" };
        }

        this[pendingKey] = {
            requesterMark: mark,
            requestedAt: Date.now(),
            type,
            phase: this.status
        };

        return {
            status: "ok",
            requesterMark: mark,
            requestedAt: this[pendingKey].requestedAt,
            type,
            phase: this[pendingKey].phase
        };
    }

    requestRematch(mark) {
        return this.requestMatchAction(mark, {
            type: "rematch",
            allowedStatuses: [C.ROOM_STATUS.PLAYING, C.ROOM_STATUS.FINISHED],
            target: "restart request",
            pendingKey: "pendingRematch"
        });
    }

    requestDraw(mark) {
        return this.requestMatchAction(mark, {
            type: "draw",
            allowedStatuses: [C.ROOM_STATUS.PLAYING],
            target: "draw request",
            pendingKey: "pendingDraw"
        });
    }

    respondToMatchAction(mark, {
        type,
        accept,
        pendingRequest,
        clearPendingRequest,
    }) {
        if (!pendingRequest) {
            return { status: "error", message: `There is no ${type} request to respond to` };
        }

        const requesterMark = pendingRequest.requesterMark;
        const responderMark = this.getOpponentMark(requesterMark);

        if (mark !== responderMark) {
            return { status: "error", message: "Only the other player can answer this request" };
        }

        clearPendingRequest.call(this);

        return {
            status: "ok",
            requesterMark,
            responderMark,
            accepted: Boolean(accept),
            type,
            phase: pendingRequest.phase
        };
    }

    respondToRematch(mark, accept) {
        return this.respondToMatchAction(mark, {
            type: "rematch",
            accept,
            pendingRequest: this.pendingRematch,
            clearPendingRequest: this.clearRematchRequest
        });
    }

    respondToDraw(mark, accept) {
        const result = this.respondToMatchAction(mark, {
            type: "draw",
            accept,
            pendingRequest: this.pendingDraw,
            clearPendingRequest: this.clearDrawRequest
        });

        if (result.status !== "ok" || !result.accepted) {
            return result;
        }

        this.game.stopTimer();
        this.game.setWinner("draw");
        this.game.setWinningLine(null);
        this.game.setCyclePath(null);
        this.game.setNextAction("winner");
        this.status = C.ROOM_STATUS.FINISHED;

        return result;
    }

    forfeitPlayer(mark, reason = "leave") {
        if (!["X", "O"].includes(mark)) {
            return { status: "error", message: "Only active players can forfeit" };
        }

        const winnerMark = this.getOpponentMark(mark);
        if (!winnerMark || !this.getPlayer(winnerMark)) {
            return { status: "error", message: "An opponent is required for a forfeit result" };
        }

        this.game.stopTimer();
        this.clearCountdown();
        this.clearPendingRequests();
        this.clearDisconnectState();
        this.game.setWinner(winnerMark);
        this.game.setNextAction("winner");
        this.game.setCyclePath(null);
        this.game.setCollapseChoices(null);
        this.status = C.ROOM_STATUS.FINISHED;

        return {
            status: "ok",
            winnerMark,
            loserMark: mark,
            reason
        };
    }

}
