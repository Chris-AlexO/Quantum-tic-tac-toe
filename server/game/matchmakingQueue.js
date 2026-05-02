export function createMatchmakingQueue({
  ttlMs = 30_000,
  hasRoom = () => false
} = {}) {
  let queue = [];

  return {
    enqueue({ playerId, roomId, type = "mp", ruleset = "house" }) {
      queue = queue.filter(entry => entry.playerId !== playerId);
      queue.push({ playerId, roomId, type, ruleset, createdAt: Date.now() });
    },

    dequeue({ exceptPlayerId, type = "mp", ruleset = "house" }) {
      const now = Date.now();

      for (let i = 0; i < queue.length; i++) {
        const entry = queue[i];
        const isStale = now - entry.createdAt > ttlMs;
        const isInvalid =
          entry.type !== type ||
          (entry.ruleset ?? "house") !== ruleset ||
          entry.playerId === exceptPlayerId ||
          !hasRoom(entry.roomId);

        if (isStale || isInvalid) {
          if (isStale || !hasRoom(entry.roomId)) {
            queue.splice(i, 1);
            i--;
          }
          continue;
        }

        queue.splice(i, 1);
        return entry;
      }

      return null;
    },

    removePlayer(playerOrId) {
      const playerId = typeof playerOrId === "string" ? playerOrId : playerOrId?.playerId;
      queue = queue.filter(entry => entry.playerId !== playerId);
    },

    removeRoom(roomId) {
      queue = queue.filter(entry => entry.roomId !== roomId);
    }
  };
}
