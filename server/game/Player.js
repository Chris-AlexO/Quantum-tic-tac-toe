export default class Player {

    constructor(playerId, socketId, playerName = "Waiting...", mark = null) {
        this.playerId = playerId;
        this.socketId = socketId;
        this.playerName = playerName;
        this.mark = mark;

        this.connectionStatus = "online";
        this.roomId = null;
    }

    getPlayerID() {
        return this.playerId;
    }

    getSocketID() {
        return this.socketId;
    }

    setSocketID(id) {
        this.socketId = id;
    }

    setName(name) {
        if (!name) return;
        this.playerName = name;
    }

    getName() {
        return this.playerName;
    }

    setMark(mark) {
        if (!["X", "O"].includes(mark)) return;
        this.mark = mark;
    }

    setRoom(roomId) {
        this.roomId = roomId;
    }

    leaveRoom() {
        this.roomId = null;
        this.mark = null;
    }

    setOnline() {
        this.connectionStatus = "online";
    }

    setOffline() {
        this.connectionStatus = "offline";
    }

    isOnline() {
        return this.connectionStatus === "online";
    }
}