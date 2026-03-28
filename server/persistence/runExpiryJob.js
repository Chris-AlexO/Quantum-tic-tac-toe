import { createGameRepository } from "./createGameRepository.js";

async function main() {
  const repository = createGameRepository();

  if (typeof repository.deleteExpiredRooms !== "function") {
    console.log(JSON.stringify({
      ok: true,
      message: "Repository driver does not support room expiry.",
      deletedRoomCount: 0,
      deletedRoomIds: [],
    }));
    return;
  }

  try {
    await repository.ping?.();
    const result = await repository.deleteExpiredRooms();

    console.log(JSON.stringify({
      ok: true,
      message: `Expired room cleanup completed at ${new Date().toISOString()}.`,
      deletedRoomCount: result?.deletedRoomCount ?? 0,
      deletedRoomIds: result?.deletedRoomIds ?? [],
    }));
  } finally {
    await repository.close?.();
  }
}

main().catch(error => {
  console.error(JSON.stringify({
    ok: false,
    message: error?.message || "Failed to run room expiry job.",
  }));
  process.exitCode = 1;
});
