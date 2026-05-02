import { getGameSocket, setSocketAuth } from "./gameSocket.js";

export function emitWithAck(event, payload = {}, { roomId = null } = {}) {
  const activeRoomId = payload.roomId ?? roomId;
  const nextPayload = activeRoomId ? { ...payload, roomId: activeRoomId } : { ...payload };
  const activeSocket = setSocketAuth({ roomId: activeRoomId });

  return new Promise((resolve, reject) => {
    activeSocket.emit(event, nextPayload, ack => {
      if (!ack || ack.status === "error") {
        reject(ack || { status: "error", message: "Request failed" });
        return;
      }

      resolve(ack);
    });
  });
}
