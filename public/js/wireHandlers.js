import { sock } from "./sock.js";
import { emit } from "./bus.js";

export function wireSocketToBus() {
  const onConnect = () => emit("net:connect", { id: sock.id });
  const onRoomCreated = (roomId) => emit("room:created", roomId);
  const onRoomReady = (roomId) => emit("room:ready", roomId);
  const onRoomState = (state) => emit("room:state", state);
  const onCycleFound = (payload) => emit("room:cycle", payload);
  const onDisconnect = (r) => emit("net:disconnect", { reason: r });

  sock.on("connect", onConnect);
  sock.on('roomCreated', onRoomCreated)
  sock.on("roomReady", onRoomReady);
  sock.on("roomStateUpdated", onRoomState);
  sock.on("cycleFound", onCycleFound);
  sock.on("disconnect", onDisconnect);

  // teardown
  return () => {
    sock.off("connect", onConnect);
    sock.off("roomReady", onRoomReady);
    sock.off("roomStateUpdated", onRoomState);
    sock.off("cycleFound", onCycleFound);
    sock.off("disconnect", onDisconnect);
  };
}
