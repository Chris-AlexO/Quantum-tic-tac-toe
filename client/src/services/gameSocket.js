import { io } from "socket.io-client";
import {
  getOrMakePlayerId,
  setSavedPlayerName
} from "../lib/playerProfile.js";
import { setLocalValue } from "../lib/browserStorage.js";
import { SOCKET_EVENTS } from "../../../shared/game/events.js";

let socket = null;

function getRoomIdFromPath(pathname = window.location.pathname) {
  const match = pathname.match(/^\/game\/mp\/([a-f0-9-]{10,})\/?$/i);
  return match ? match[1] : null;
}

export function getGameSocket() {
  if (socket) {
    return socket;
  }

  socket = io({
    auth: {
      playerId: getOrMakePlayerId(),
      roomId: getRoomIdFromPath()
    }
  });

  socket.on(SOCKET_EVENTS.IDENTITY, payload => {
    if (payload?.playerId) {
      setLocalValue("playerId", payload.playerId);
    }

    if (payload?.playerName) {
      setSavedPlayerName(payload.playerName);
    }
  });

  return socket;
}

export function setSocketAuth({ roomId = null } = {}) {
  const activeSocket = getGameSocket();
  activeSocket.auth = {
    ...(activeSocket.auth || {}),
    playerId: getOrMakePlayerId(),
    roomId
  };
  return activeSocket;
}
