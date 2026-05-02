import Room from "./Room.js";
import { createMatchmakingQueue } from "./matchmakingQueue.js";
import { createPlayerRoomIndex } from "./playerRoomIndex.js";
import { createRoomPersistenceSession } from "./roomPersistenceSession.js";

export default class RoomManager {
    constructor({ repository = null, runRepositoryTask = null } = {}){
        this.rooms = new Map();
        this.playerRooms = createPlayerRoomIndex();
        this.hostIndex = this.playerRooms.hostIndex;
        this.playerIndex = this.playerRooms.playerIndex; //{playerID: roomId, mark}
        this.repository = repository;
        this.runRepositoryTask = runRepositoryTask;
	        this.matchmakingQueue = createMatchmakingQueue({
	          hasRoom: roomId => this.rooms.has(roomId)
	        });
	        this.persistenceSession = createRoomPersistenceSession({
	          getPlayerId: playerOrId => this.getPlayerId(playerOrId),
	          rooms: this.rooms,
	          playerIndex: this.playerIndex,
	          getRepositoryContext: () => ({
	            repository: this.repository,
	            runRepositoryTask: this.runRepositoryTask
	          })
	        });
	    }

    setPersistenceContext({ repository = null, runRepositoryTask = null } = {}) {
        this.repository = repository;
        this.runRepositoryTask = runRepositoryTask;
    }

    getPlayerId(playerOrId) {
        return this.playerRooms.getPlayerId(playerOrId);
    }

    createRoom(deps){
        const player = deps?.playerX;

        if (!player) return null;
        if(this.getPlayerRoom(player) != null) return null;//Player already has a room;

        const room = new Room(deps);
        this.rooms.set(room.roomId, room);

        player.setRoom(room.roomId);
        player.setMark("X");

        this.playerRooms.addPlayer(player, room, "X");
        return room.roomId;
    }

    deleteRoom(room) {
      if (!room) return false;

      this.rooms.delete(room.roomId);

      this.playerRooms.clearRoom(room.roomId);
      this.matchmakingQueue.removeRoom(room.roomId);

      return true;
}

    clearRoomReferences(room, {
      playerId = null,
      dropSeat = false,
      clearSpectators = false
    } = {}) {
      if (!room) return false;

      const targetPlayerId = playerId ?? null;
      if (targetPlayerId) {
        this.playerRooms.clearPlayer(targetPlayerId, room.roomId);
      } else {
        this.playerRooms.clearRoom(room.roomId);
      }

      if (dropSeat) {
        if (!targetPlayerId || room.players.X?.playerId === targetPlayerId) {
          room.players.X = null;
          room.clientReady.X = false;
        }

        if (!targetPlayerId || room.players.O?.playerId === targetPlayerId) {
          room.players.O = null;
          room.clientReady.O = false;
        }

        room.spectators = new Set(
          Array.from(room.spectators ?? []).filter(spectator =>
            targetPlayerId ? spectator?.playerId !== targetPlayerId : false
          )
        );
      }

      if (clearSpectators) {
        room.spectators = new Set();
      }

      this.matchmakingQueue.removeRoom(room.roomId);
      if (targetPlayerId) {
        this.matchmakingQueue.removePlayer(targetPlayerId);
      }

      return true;
    }

    shouldDeleteRoom(room) {
      if (!room) return false;

      return !this.playerRooms.hasRoomReference(room.roomId);
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
        this.playerIndex.set(player.playerId, { roomId: player.roomId });

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

        this.playerRooms.addPlayer(player, room, mark);

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
	      return this.persistenceSession.getPersistedPlayerPresence(playerOrId);
	    }

	    async hydratePlayerFromPersistence(player) {
	      return this.persistenceSession.hydratePlayerFromPersistence(player);
	    }

	    async resolvePlayerSession(playerOrId) {
	      return this.persistenceSession.resolvePlayerSession(playerOrId);
	    }

	    async resolvePlayerRoom(playerOrId) {
	      return this.persistenceSession.resolvePlayerRoom(playerOrId);
	    }

    enqueueWaiting({ playerId, roomId, type = "mp", ruleset = "house" }) {
    this.matchmakingQueue.enqueue({ playerId, roomId, type, ruleset });
  }

  dequeueMatch({ exceptPlayerId, type = "mp", ruleset = "house" }) {
    return this.matchmakingQueue.dequeue({ exceptPlayerId, type, ruleset });
  }

  removeFromQueue(player) {
    this.matchmakingQueue.removePlayer(player);
  }

  quickMatch(player, { type = "mp", ruleset = "house" } = {}) {
      const existingRoom = this.getPlayerRoom(player);
      if (existingRoom) {
        const rec = this.playerIndex.get(player.playerId);
        return {
          kind: "EXISTS",
          roomId: existingRoom.roomId,
          mark: rec?.mark ?? null,
        };
      }

      const match = this.dequeueMatch({ exceptPlayerId: player.playerId, type, ruleset });

      if (match) {
        return { kind: "JOIN", roomId: match.roomId, mark: "O" };
      }

      const roomId = this.createRoom({ playerX: player, type, host: player.playerId, ruleset });
      if (!roomId) return null;

      this.enqueueWaiting({ playerId: player.playerId, roomId, type, ruleset });
      return { kind: "WAIT", roomId, mark: "X" };
    }


}
