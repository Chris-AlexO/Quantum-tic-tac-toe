import  * as http from "http";
import { Server } from "socket.io";
import { createApp } from "./http/app.js";
import RoomManager  from "./game/RoomManager.js";
import { registerSocketHandlers } from "./socket/handlers.js";
import { createGameRepository } from "./persistence/createGameRepository.js";

const repository = createGameRepository();
const databaseStatus = {
  available: false,
  message: "Database unavailable",
  checkedAt: null,
};

if (typeof repository.setConnectionErrorHandler === "function") {
  repository.setConnectionErrorHandler(error => {
    databaseStatus.available = false;
    databaseStatus.message = error?.message || "Unable to reach PostgreSQL";
    databaseStatus.checkedAt = new Date().toISOString();
  });
}

async function refreshDatabaseStatus() {
  try {
    if (typeof repository.ping !== "function") {
      databaseStatus.available = false;
      databaseStatus.message = "Database integration disabled";
      return;
    }

    await repository.ping();

    databaseStatus.available = true;
    databaseStatus.message = "PostgreSQL online";
  } catch (error) {
    databaseStatus.available = false;
    databaseStatus.message = error?.message || "Unable to reach PostgreSQL";
  } finally {
    databaseStatus.checkedAt = new Date().toISOString();
  }
}

async function runRepositoryTask(task) {
  if (typeof task !== "function") {
    return null;
  }

  try {
    const result = await task();
    if (!databaseStatus.available) {
      await refreshDatabaseStatus();
    }
    return result;
  } catch (error) {
    databaseStatus.available = false;
    databaseStatus.message = error?.message || "Unable to reach PostgreSQL";
    databaseStatus.checkedAt = new Date().toISOString();
    return null;
  }
}

async function listAdminOverview() {
  if (typeof repository.listRooms !== "function" || typeof repository.listPlayers !== "function") {
    return { rooms: [], players: [] };
  }

  const [rooms, players] = await Promise.all([
    runRepositoryTask(() => repository.listRooms({ limit: 30 })),
    runRepositoryTask(() => repository.listPlayers({ limit: 60 })),
  ]);

  return {
    rooms: Array.isArray(rooms)
      ? rooms.map(room => ({
          id: room.id,
          roomType: room.room_type,
          ruleset: room.ruleset,
          status: room.status,
          hostPlayerId: room.host_player_id,
          currentTurn: room.current_turn,
          nextAction: room.next_action,
          winner: room.winner,
          updatedAt: room.updated_at,
        }))
      : [],
    players: Array.isArray(players)
      ? players.map(player => ({
          id: player.id,
          displayName: player.display_name,
          connectionStatus: player.connection_status,
          activeRoomId: player.active_room_id,
          activeRole: player.active_role,
          activeMark: player.active_mark,
          updatedAt: player.updated_at,
        }))
      : [],
  };
}

async function getAdminRoom(roomId) {
  if (typeof repository.getRoomSnapshot !== "function") {
    return null;
  }

  const snapshot = await runRepositoryTask(() => repository.getRoomSnapshot(roomId));
  if (!snapshot) {
    return null;
  }

  return {
    id: roomId,
    snapshot
  };
}

async function getAdminPlayer(playerId) {
  if (typeof repository.getPlayerPresence !== "function") {
    return null;
  }

  const player = await runRepositoryTask(() => repository.getPlayerPresence(playerId));
  if (!player) {
    return null;
  }

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
    snapshot: player.snapshot ?? null,
  };
}

await refreshDatabaseStatus();
setInterval(refreshDatabaseStatus, 10000).unref();

const app = createApp({
  getAppConfig: () => ({
    devMode: process.env.NODE_ENV !== "production",
    dbAvailable: databaseStatus.available,
    multiplayerEnabled: databaseStatus.available,
    dbStatusText: databaseStatus.message,
    dbCheckedAt: databaseStatus.checkedAt,
  }),
  refreshAppConfig: refreshDatabaseStatus,
  listActiveGames: async () => {
    if (typeof repository.listActiveRooms !== "function") {
      return [];
    }

    return runRepositoryTask(() => repository.listActiveRooms()).then(result =>
      Array.isArray(result)
        ? result
            .filter(game => ["waiting", "starting", "playing"].includes(game.status))
            .map(game => ({
              id: game.id,
              roomType: game.room_type,
              ruleset: game.ruleset,
              status: game.status,
              updatedAt: game.updated_at,
              snapshot: game.snapshot_json
            }))
        : null
    );
  },
  getAdminOverview: listAdminOverview,
  getAdminRoom,
  getAdminPlayer
});
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ["http://localhost:3000"] } });

const rm = new RoomManager({
  repository,
  runRepositoryTask
});


registerSocketHandlers({
  io: io,
  roomManager: rm,
  repository,
  runRepositoryTask
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`HTTP server listening on http://localhost:${process.env.PORT || 3000}`);
});
