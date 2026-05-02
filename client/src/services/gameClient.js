import { createGameHttpClient } from "./gameHttpClient.js";
import { createGameSocketClient } from "./gameSocketClient.js";

export function createGameClient({ sessionStore } = {}) {
  return {
    ...createGameSocketClient({ sessionStore }),
    ...createGameHttpClient()
  };
}
