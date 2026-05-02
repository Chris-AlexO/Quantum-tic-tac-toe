import * as http from "http";
import { Server } from "socket.io";
import { createApp } from "./http/app.js";
import RoomManager from "./game/RoomManager.js";
import { registerSocketHandlers } from "./socket/handlers.js";
import { createGameRepository } from "./persistence/createGameRepository.js";
import { createDatabaseStatusService } from "./persistence/databaseStatusService.js";
import { createRepositoryAdapters } from "./persistence/repositoryAdapters.js";
import { createLogger } from "./lib/logger.js";

const logger = createLogger("server");

const repository = createGameRepository();
const databaseStatus = createDatabaseStatusService({ repository });
await databaseStatus.refresh();
databaseStatus.start();

const repositoryAdapters = createRepositoryAdapters({
  repository,
  runRepositoryTask: databaseStatus.runTask
});

const app = createApp({
  getAppConfig: databaseStatus.getAppConfig,
  refreshAppConfig: databaseStatus.refresh,
  ...repositoryAdapters
});
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ["http://localhost:3000"] } });

const rm = new RoomManager({
  repository,
  runRepositoryTask: databaseStatus.runTask
});


registerSocketHandlers({
  io: io,
  roomManager: rm,
  repository,
  runRepositoryTask: databaseStatus.runTask
});

server.listen(process.env.PORT || 3000, () => {
  logger.info("HTTP server listening", {
    url: `http://localhost:${process.env.PORT || 3000}`
  });
});
