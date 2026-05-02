import { createDepartureService } from "./services/departureService.js";
import { createRoomBroadcastService } from "./services/roomBroadcastService.js";
import { createRoomEntryService } from "./services/roomEntryService.js";

export function createSocketConnectionContext({
  io,
  sock,
  player,
  roomManager,
  repository,
  runRepositoryTask,
  logger
}) {
  const broadcast = createRoomBroadcastService({
    io,
    repository,
    runRepositoryTask,
    logger
  });
  const roomEntry = createRoomEntryService({
    sock,
    player,
    roomManager,
    broadcast
  });
  const departure = createDepartureService({
    io,
    sock,
    player,
    roomManager,
    broadcast
  });

  return {
    io,
    sock,
    player,
    roomManager,
    logger,
    ...broadcast,
    ...roomEntry,
    ...departure
  };
}
