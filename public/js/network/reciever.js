/*==========================================================
These are the 'getters' that retrieve information from server.
=============================================================*/

import { withAck } from "./withAck.js";

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
        }

    };



    return reciever;
}
