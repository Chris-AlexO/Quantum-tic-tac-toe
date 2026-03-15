import Room from "./Room.js";

export default class RoomManager {
    constructor({ repository = null, runRepositoryTask = null } = {}){
        this.rooms = new Map();
        this.hostIndex = new Map();
        this.playerIndex = new Map(); //{playerID: roomId, mark}
        this.waitingPlayer= null;
        this.repository = repository;
        this.runRepositoryTask = runRepositoryTask;

        this.waitQueue = []; // [{ playerId, roomId, type, createdAt }]
        this.WAIT_TTL_MS = 30_000; 
    }

    setPersistenceContext({ repository = null, runRepositoryTask = null } = {}) {
        this.repository = repository;
        this.runRepositoryTask = runRepositoryTask;
    }

    getPlayerId(playerOrId) {
        if (!playerOrId) return null;
        if (typeof playerOrId === "string") return playerOrId;
        if (typeof playerOrId.getPlayerID === "function") {
            return playerOrId.getPlayerID();
        }
        return playerOrId.playerId ?? null;
    }

    createRoom(deps){
        const player = deps?.playerX;

        if (!player) return null;
        if(this.getPlayerRoom(player) != null) return null;//Player already has a room;

        const room = new Room(deps);
        this.rooms.set(room.roomId, room);

        player.setRoom(room.roomId);
        player.setMark("X");

        this.hostIndex.set(player.playerId, room.roomId);
        this.playerIndex.set(player.playerId, {
          roomId: room.roomId,
          socketId: player.socketId,
          player,
          mark: "X",
        });
        return room.roomId;
    }

    deleteRoom(room) {
      if (!room) return false;

      this.rooms.delete(room.roomId);

      for (const [playerId, rec] of this.playerIndex.entries()) {
        if (rec.roomId === room.roomId) {
          this.playerIndex.delete(playerId);
        }
      }

      for (const [playerId, rid] of this.hostIndex.entries()) {
        if (rid === room.roomId) {
          this.hostIndex.delete(playerId);
        }
      }

      this.waitQueue = this.waitQueue.filter(w => w.roomId !== room.roomId);

      if (this.waitingPlayer?.roomId === room.roomId) {
        this.waitingPlayer = null;
      }

      return true;
}

    getRoom(roomId){
        return this.rooms.get(roomId);
    }

    doesRoomExist(room){
        return this.getRoom(room.roomId) != null;
    }

    getRoomCount({ type = null } = {}){
        if (!type) {
          return this.rooms.size;
        }

        let count = 0;
        for (const room of this.rooms.values()) {
          if (room?.type === type) {
            count++;
          }
        }
        return count;
    }

    getRoomCapacity() {
      const capacity = Number(process.env.QTTT_DB_ROOM_CAPACITY);
      return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
    }

    isRoomCapacityReached(type = "mp") {
      const capacity = this.getRoomCapacity();
      if (!capacity) {
        return false;
      }

      return this.getRoomCount({ type }) >= capacity;
    }

    registerPlayer(player){
        this.playerIndex.set(
            player.playerId, 
        {
          roomId: player.roomId,
        });

        //if(player.mark === "X") this.hostIndex.set(player.playerId, room.roomId);
        return 1;
    }

    unregisterPlayer(player){
        this.playerIndex.delete(player.playerId);
        this.hostIndex.delete(player.playerId);
        return 1;
    }

    addPlayerToRoom(player, room, mark) {
        if (!player || !room || !mark) return false;

        const rec = this.playerIndex.get(player.playerId) || {};
        this.playerIndex.set(player.playerId, {
          ...rec,
          roomId: room.roomId,
          socketId: player.socketId,
          player,
          mark,
        });

        room.players[mark] = player;
        player.setRoom(room.roomId);
        player.setMark(mark);
        return true;
      }

    getPlayerRecord(playerOrId) {
        const playerId = this.getPlayerId(playerOrId);
        if (!playerId) return null;
        return this.playerIndex.get(playerId) ?? null;
    }

    getPlayerRoom(playerOrId){
        const playerId = this.getPlayerId(playerOrId);
        const roomId = this.playerIndex.get(playerId)?.roomId;
        return this.rooms.get(roomId);
    }

    async getPersistedPlayerPresence(playerOrId) {
      const playerId = this.getPlayerId(playerOrId);
      if (!playerId || !this.repository?.getPlayerPresence || !this.runRepositoryTask) {
        return null;
      }

      return this.runRepositoryTask(() => this.repository.getPlayerPresence(playerId));
    }

    async hydratePlayerFromPersistence(player) {
      if (!player) return null;

      const persisted = await this.getPersistedPlayerPresence(player);
      if (!persisted) {
        return null;
      }

      if (persisted.displayName && !player.getName()) {
        player.setName(persisted.displayName);
      }

      if (persisted.activeRoomId && this.rooms.has(persisted.activeRoomId)) {
        const room = this.rooms.get(persisted.activeRoomId);
        const nextMark = persisted.activeMark ?? room.getPlayerMark(player) ?? null;
        const rec = this.playerIndex.get(player.playerId) || {};

        this.playerIndex.set(player.playerId, {
          ...rec,
          roomId: persisted.activeRoomId,
          socketId: player.socketId,
          player,
          mark: nextMark,
          role: persisted.activeRole ?? rec.role ?? null,
        });

        player.setRoom(persisted.activeRoomId);
        if (nextMark) {
          player.setMark(nextMark);
        }
      }

      return persisted;
    }

    async resolvePlayerSession(playerOrId) {
      const playerId = this.getPlayerId(playerOrId);
      if (!playerId) {
        return null;
      }

      const cachedRecord = this.playerIndex.get(playerId);
      const cachedRoom = cachedRecord?.roomId ? this.rooms.get(cachedRecord.roomId) : null;
      if (cachedRoom) {
        return {
          source: "cache",
          room: cachedRoom,
          roomId: cachedRoom.roomId,
          mark: cachedRecord?.mark ?? cachedRoom.getPlayerMark(playerOrId) ?? null,
          role: cachedRecord?.mark ? "player" : cachedRecord?.role ?? null,
          snapshot: null,
        };
      }

      const persisted = await this.getPersistedPlayerPresence(playerId);
      if (!persisted?.activeRoomId || !this.rooms.has(persisted.activeRoomId)) {
        return persisted
          ? {
              source: "db",
              room: null,
              roomId: persisted.activeRoomId ?? null,
              mark: persisted.activeMark ?? null,
              role: persisted.activeRole ?? null,
              snapshot: persisted.snapshot ?? null,
              displayName: persisted.displayName ?? null,
            }
          : null;
      }

      const room = this.rooms.get(persisted.activeRoomId);
      const record = cachedRecord || {};
      this.playerIndex.set(playerId, {
        ...record,
        roomId: persisted.activeRoomId,
        mark: persisted.activeMark ?? record.mark ?? room.getPlayerMark(playerOrId) ?? null,
        role: persisted.activeRole ?? record.role ?? null,
      });

      return {
        source: "db",
        room,
        roomId: room.roomId,
        mark: persisted.activeMark ?? room.getPlayerMark(playerOrId) ?? null,
        role: persisted.activeRole ?? null,
        snapshot: persisted.snapshot ?? null,
        displayName: persisted.displayName ?? null,
      };
    }

    async resolvePlayerRoom(playerOrId) {
      const session = await this.resolvePlayerSession(playerOrId);
      return session?.room ?? null;
    }

    enqueueWaiting({ playerId, roomId, type = "mp" }) {
    // prevent duplicates
    this.waitQueue = this.waitQueue.filter(w => w.playerId !== playerId);

    this.waitQueue.push({ playerId, roomId, type, createdAt: Date.now() });
  }

  dequeueMatch({ exceptPlayerId, type = "mp" }) {
    const now = Date.now();

    // find first valid entry
    for (let i = 0; i < this.waitQueue.length; i++) {
      const w = this.waitQueue[i];

      // skip wrong type
      if (w.type !== type) continue;

      // skip self
      if (w.playerId === exceptPlayerId) continue;

      // drop stale entries
      if (now - w.createdAt > this.WAIT_TTL_MS) {
        this.waitQueue.splice(i, 1);
        i--;
        continue;
      }

      // drop if room gone
      if (!this.rooms.has(w.roomId)) {
        this.waitQueue.splice(i, 1);
        i--;
        continue;
      }

      // found a match: remove and return it
      this.waitQueue.splice(i, 1);
      return w;
    }

    return null;
  }

  removeFromQueue(player) {
    this.waitQueue = this.waitQueue.filter(w => w.playerId !== player.playerId);
  }

    
    setWaitingPlayer({ playerId, roomId }) 
    {
    this.waitingPlayer = { playerId, roomId, createdAt: Date.now() };
    }

    clearWaitingPlayer(player) {
    if (this.waitingPlayer?.playerId === player.playerId) this.waitingPlayer = null;
    }

    claimWaiting(exceptPlayer) {
        if (!this.waitingPlayer) return null;
        if (this.waitingPlayer.playerId === exceptPlayer.playerId) return null;

        const w = this.waitingPlayer;
        this.waitingPlayer = null;
    return w;
    }

    getWaitingPlayer() {
    return this.waitingPlayer;
    }

    disconnectPlayer(player){

    }

    reconnectPlayer(player){

    }

    // --- Example matchmaking API ---

  /**
   * Call when a player clicks "Quick Match"
   * Returns: { kind: "JOIN", roomId, mark } or { kind: "WAIT", roomId, mark }
   */
  quickMatch(player, { type = "mp" } = {}) {
      const existingRoom = this.getPlayerRoom(player);
      if (existingRoom) {
        const rec = this.playerIndex.get(player.playerId);
        return {
          kind: "EXISTS",
          roomId: existingRoom.roomId,
          mark: rec?.mark ?? null,
        };
      }

      const match = this.dequeueMatch({ exceptPlayerId: player.playerId, type });

      if (match) {
        return { kind: "JOIN", roomId: match.roomId, mark: "O" };
      }

      const roomId = this.createRoom({ playerX: player, type, host: player.playerId });
      if (!roomId) return null;

      this.enqueueWaiting({ playerId: player.playerId, roomId, type });
      return { kind: "WAIT", roomId, mark: "X" };
    }


}
