import { io } from "/socket.io/socket.io.esm.min.js";


export function getRoomIdFromURL() {
  const m = location.pathname.match(/^\/game\/mp\/([a-f0-9-]{10,})\/?$/i);
  return m ? m[1] : null;
}

export const sock = io({auth: {
    playerId: localStorage.getItem("playerId"),
    roomId: /*sessionStorage.getItem("roomId") ||*/ getRoomIdFromURL(),
  }
});

