import Game from "./Game.js";
import { v4 as uuidv4 } from "uuid";
import C from "./constants.js";
import { createRoomTimers } from "./roomTimers.js";
import {
    applyAcceptedDraw,
    forfeitPlayer,
    requestDraw,
    requestMatchAction,
    requestRematch,
    respondToMatchAction
} from "./roomRequestPolicy.js";

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

        this.timers = createRoomTimers(this.roomId);
        this.pendingRematch = null;
        this.pendingDraw = null;
    }

    get countdownEndsAt() {
        return this.timers.countdownEndsAt;
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
        if (this.timers.hasCountdown()) return false;

        this.status = C.ROOM_STATUS.STARTING;
        this.clearDisconnectState();
        return this.timers.beginCountdown(onComplete, delayMs);
    }

    clearCountdown() {
        this.timers.clearCountdown();
    }

    getDisconnectState() {
        return this.timers.getDisconnectState();
    }

    setDisconnectState(mark, expiresAt) {
        this.timers.setDisconnectState(mark, expiresAt);
    }

    clearDisconnectState() {
        this.timers.clearDisconnectState();
    }

    isTimingOut(player){
        return this.timers.isTimingOut(player);
    }

    startTimeout(player, callback){
        this.timers.startTimeout(player, callback);
    }

    startTimeoutInterval(player, callback){
        this.timers.startTimeoutInterval(player, callback);
    }

    startPlayerOfflineTimeout(player, callback){
        this.timers.startPlayerOfflineTimeout(player, callback);
    }

    endTimeout(player) {
        this.timers.endTimeout(player);
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
        return requestMatchAction(this, mark, { type, allowedStatuses, target, pendingKey });
    }

    requestRematch(mark) {
        return requestRematch(this, mark);
    }

    requestDraw(mark) {
        return requestDraw(this, mark);
    }

    respondToMatchAction(mark, {
        type,
        accept,
        pendingRequest,
        clearPendingRequest,
    }) {
        return respondToMatchAction(this, mark, { type, accept, pendingRequest, clearPendingRequest });
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

        applyAcceptedDraw(this);

        return result;
    }

    forfeitPlayer(mark, reason = "leave") {
        return forfeitPlayer(this, mark, reason);
    }

}
