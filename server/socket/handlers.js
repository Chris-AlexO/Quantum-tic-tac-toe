import crypto from "crypto";

import { SOCKET_EVENTS } from "../../shared/game/events.js";
import Player from "../game/Player.js";
import { createLogger } from "../lib/logger.js";
import { createSocketConnectionContext } from "./connectionContext.js";
import { registerDepartureHandlers } from "./departureHandlers.js";
import { registerGameplayHandlers } from "./gameplayHandlers.js";
import { registerIdentityHandlers } from "./identityHandlers.js";
import { registerMatchRequestHandlers } from "./matchRequestHandlers.js";
import { registerRoomEntryHandlers } from "./roomEntryHandlers.js";

const logger = createLogger("socket");

export function registerSocketHandlers({ io, roomManager, repository, runRepositoryTask }) {
  io.use((socket, next) => {
    const { playerId, roomId, mark } = socket.handshake.auth || {};
    socket.playerId = playerId || crypto.randomUUID();
    socket.initialRoomId = roomId || null;
    socket.mark = mark;
    next();
  });

  io.on(SOCKET_EVENTS.CONNECTION, async sock => {
    logger.info("Player connected", {
      socketId: sock.id,
      playerId: sock.playerId
    });

    const player = new Player(sock.playerId, sock.id, sock.playerName ?? "", "");
    await roomManager.hydratePlayerFromPersistence?.(player);
    player.setOnline();

    sock.emit(SOCKET_EVENTS.IDENTITY, {
      playerId: sock.playerId,
      playerName: player.getName()
    });

    const context = createSocketConnectionContext({
      io,
      sock,
      player,
      roomManager,
      repository,
      runRepositoryTask,
      logger
    });

    registerIdentityHandlers(context);
    registerRoomEntryHandlers(context);
    registerGameplayHandlers(context);
    registerMatchRequestHandlers(context);
    registerDepartureHandlers(context);
  });
}
