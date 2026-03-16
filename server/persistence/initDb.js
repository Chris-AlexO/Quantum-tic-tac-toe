import { createGameRepository } from "./createGameRepository.js";

const repository = createGameRepository();

try {
  await repository.ping?.();
  console.log("Database schema is ready.");
} catch (error) {
  console.error("Database initialization failed:", error?.message || error);
  process.exitCode = 1;
} finally {
  await repository.close?.();
}
