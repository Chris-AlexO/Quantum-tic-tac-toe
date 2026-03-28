/*==========================================================
These are the 'getters' that retrieve information from server.
=============================================================*/

import { withAck } from "./withAck.js";
import { getOrMakePlayerId } from "../game/state.js";

function getPlayerHeaders() {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-player-id": getOrMakePlayerId()
    };
}

export function createReciever(){
    const reciever = {
        enterRoom(roomId) {
            return withAck("enterRoom", { roomId });
        },
    
        getState(roomId) {
            return withAck("getState", { roomId });
        },

        clientReady(roomId){
            return withAck("clientReady", { roomId });
        },

        async getLocalGameSnapshot() {
            const response = await fetch("/api/local-game", {
              headers: getPlayerHeaders()
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to load the local game");
            }

            return payload;
        },

        async saveLocalGameSnapshot({ playerName, snapshot }) {
            const response = await fetch("/api/local-game", {
              method: "PUT",
              headers: getPlayerHeaders(),
              body: JSON.stringify({ playerName, snapshot })
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to save the local game");
            }

            return payload;
        },

        async clearLocalGameSnapshot() {
            const response = await fetch("/api/local-game", {
              method: "DELETE",
              headers: getPlayerHeaders()
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to clear the local game");
            }

            return payload;
        },

        async listActiveGames() {
            const response = await fetch("/api/active-games", {
              headers: {
                Accept: "application/json"
              }
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to load active games");
            }

            return payload;
        },

        async getAdminOverview() {
            const response = await fetch("/api/admin/db", {
              headers: {
                Accept: "application/json"
              }
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to load database overview");
            }

            return payload;
        },

        async getAdminRoom(roomId) {
            const response = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}`, {
              headers: {
                Accept: "application/json"
              }
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to load room details");
            }

            return payload;
        },

        async getAdminPlayer(playerId) {
            const response = await fetch(`/api/admin/players/${encodeURIComponent(playerId)}`, {
              headers: {
                Accept: "application/json"
              }
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to load player details");
            }

            return payload;
        },

        async runAdminExpiryJob() {
            const response = await fetch("/api/admin/db/expire", {
              method: "POST",
              headers: {
                Accept: "application/json"
              }
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to run room expiry");
            }

            return payload;
        },

        async clearAdminDatabase() {
            const response = await fetch("/api/admin/db/clear", {
              method: "POST",
              headers: {
                Accept: "application/json"
              }
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.message || "Unable to clear persisted data");
            }

            return payload;
        }

    };



    return reciever;
}
