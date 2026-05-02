import { getOrMakePlayerId } from "../lib/playerProfile.js";

export function createGameHttpClient() {
  return {
    getLocalGameSnapshot() {
      return requestJson("/api/local-game", { headers: getPlayerHeaders() }, "Unable to load the local game");
    },

    saveLocalGameSnapshot({ playerName, snapshot }) {
      return requestJson(
        "/api/local-game",
        {
          method: "PUT",
          headers: getPlayerHeaders(),
          body: JSON.stringify({ playerName, snapshot })
        },
        "Unable to save the local game"
      );
    },

    clearLocalGameSnapshot() {
      return requestJson(
        "/api/local-game",
        {
          method: "DELETE",
          headers: getPlayerHeaders()
        },
        "Unable to clear the local game"
      );
    },

    listActiveGames() {
      return requestJson("/api/active-games", {}, "Unable to load active games");
    },

    getAdminOverview() {
      return requestJson("/api/admin/db", {}, "Unable to load database overview");
    },

    getAdminRoom(roomId) {
      return requestJson(
        `/api/admin/rooms/${encodeURIComponent(roomId)}`,
        {},
        "Unable to load room details"
      );
    },

    getAdminPlayer(playerId) {
      return requestJson(
        `/api/admin/players/${encodeURIComponent(playerId)}`,
        {},
        "Unable to load player details"
      );
    },

    runAdminExpiryJob() {
      return requestJson(
        "/api/admin/db/expire",
        { method: "POST" },
        "Unable to run room expiry"
      );
    },

    clearAdminDatabase() {
      return requestJson(
        "/api/admin/db/clear",
        { method: "POST" },
        "Unable to clear persisted data"
      );
    }
  };
}

function getPlayerHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-player-id": getOrMakePlayerId()
  };
}

async function requestJson(path, options = {}, fallbackMessage) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers ?? {})
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}
