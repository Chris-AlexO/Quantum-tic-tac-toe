import { createGameRepository } from "./createGameRepository.js";
import { createLogger } from "../lib/logger.js";

const repository = createGameRepository();
const logger = createLogger("initDb");

try {
  await repository.ping?.();
  logger.info("Database schema is ready");
} catch (error) {
  logger.error("Database initialization failed", {
    message: error?.message || String(error)
  });
  process.exitCode = 1;
} finally {
  await repository.close?.();
}
