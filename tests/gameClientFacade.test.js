import assert from "node:assert/strict";
import test from "node:test";
import { createGameClient } from "../client/src/services/gameClient.js";

test("game client facade exposes socket and http methods", () => {
  const client = createGameClient({
    sessionStore: {
      getSnapshot: () => ({ session: { roomId: "room-1" } })
    }
  });

  const publicMethods = [
    "createRoom",
    "enterRoom",
    "getState",
    "clientReady",
    "quickMatch",
    "sendMove",
    "sendCollapse",
    "sendPlayerName",
    "joinRoomById",
    "requestRematch",
    "respondToRematch",
    "requestDraw",
    "respondToDraw",
    "leaveGame",
    "subscribeToRoomState",
    "getLocalGameSnapshot",
    "saveLocalGameSnapshot",
    "clearLocalGameSnapshot",
    "listActiveGames",
    "getAdminOverview",
    "getAdminRoom",
    "getAdminPlayer",
    "runAdminExpiryJob",
    "clearAdminDatabase"
  ];

  for (const method of publicMethods) {
    assert.equal(typeof client[method], "function", method);
  }
});
