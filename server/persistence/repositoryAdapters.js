const ACTIVE_ROOM_STATUSES = new Set(["waiting", "starting", "playing"]);

export function createRepositoryAdapters({ repository, runRepositoryTask } = {}) {
  const run = task => runRepositoryTask?.(task) ?? null;

  return {
    async listActiveGames() {
      if (typeof repository?.listActiveRooms !== "function") {
        return [];
      }

      const result = await run(() => repository.listActiveRooms());
      return Array.isArray(result)
        ? result
            .filter(game => ACTIVE_ROOM_STATUSES.has(game.status))
            .map(toActiveGame)
        : null;
    },

    async loadLocalGameSnapshot(playerId) {
      if (typeof repository?.getLocalGameSnapshot !== "function") {
        return null;
      }

      return run(() => repository.getLocalGameSnapshot(playerId));
    },

    async saveLocalGameSnapshot(playerId, payload) {
      if (typeof repository?.saveLocalGameSnapshot !== "function") {
        return { status: "unsupported" };
      }

      return (await run(() => repository.saveLocalGameSnapshot(playerId, payload))) ?? { status: "error" };
    },

    async clearLocalGameSnapshot(playerId) {
      if (typeof repository?.clearLocalGameSnapshot !== "function") {
        return { status: "unsupported" };
      }

      return (await run(() => repository.clearLocalGameSnapshot(playerId))) ?? { status: "error" };
    },

    async getAdminOverview() {
      if (typeof repository?.listRooms !== "function" || typeof repository?.listPlayers !== "function") {
        return { rooms: [], players: [] };
      }

      const [rooms, players] = await Promise.all([
        run(() => repository.listRooms({ limit: 30 })),
        run(() => repository.listPlayers({ limit: 60 }))
      ]);

      return {
        rooms: Array.isArray(rooms) ? rooms.map(toAdminRoom) : [],
        players: Array.isArray(players) ? players.map(toAdminPlayer) : []
      };
    },

    async getAdminRoom(roomId) {
      if (typeof repository?.getRoomSnapshot !== "function") {
        return null;
      }

      const snapshot = await run(() => repository.getRoomSnapshot(roomId));
      return snapshot ? { id: roomId, snapshot } : null;
    },

    async getAdminPlayer(playerId) {
      if (typeof repository?.getPlayerPresence !== "function") {
        return null;
      }

      const player = await run(() => repository.getPlayerPresence(playerId));
      return player ? toAdminPlayerDetail(player) : null;
    },

    async runRoomExpiryJob() {
      if (typeof repository?.deleteExpiredRooms !== "function") {
        return { deletedRoomCount: 0, deletedRoomIds: [] };
      }

      return (await run(() => repository.deleteExpiredRooms())) ?? {
        deletedRoomCount: 0,
        deletedRoomIds: []
      };
    },

    async clearAdminDatabase() {
      if (typeof repository?.clearAllData !== "function") {
        return { status: "unsupported" };
      }

      return (await run(() => repository.clearAllData())) ?? { status: "error" };
    }
  };
}

function toActiveGame(game) {
  return {
    id: game.id,
    roomType: game.room_type,
    ruleset: game.ruleset,
    status: game.status,
    updatedAt: game.updated_at,
    expiresAt: game.expires_at,
    snapshot: game.snapshot_json
  };
}

function toAdminRoom(room) {
  return {
    id: room.id,
    roomType: room.room_type,
    ruleset: room.ruleset,
    status: room.status,
    hostPlayerId: room.host_player_id,
    currentTurn: room.current_turn,
    nextAction: room.next_action,
    winner: room.winner,
    updatedAt: room.updated_at,
    expiresAt: room.expires_at
  };
}

function toAdminPlayer(player) {
  return {
    id: player.id,
    displayName: player.display_name,
    connectionStatus: player.connection_status,
    activeRoomId: player.active_room_id,
    activeRole: player.active_role,
    activeMark: player.active_mark,
    updatedAt: player.updated_at
  };
}

function toAdminPlayerDetail(player) {
  return {
    id: player.id,
    displayName: player.displayName,
    connectionStatus: player.connectionStatus,
    activeRoomId: player.activeRoomId,
    activeRole: player.activeRole,
    activeMark: player.activeMark,
    updatedAt: player.updatedAt,
    roomStatus: player.roomStatus,
    roomType: player.roomType,
    snapshot: player.snapshot ?? null
  };
}
