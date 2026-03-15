import { sock } from "./sock.js";
import { emit } from "./bus.js";

export function wireSocketToBus() {
  const onConnect = () => emit("net:connect", { id: sock.id });
  const onIdentity = ({ playerId }) => emit("net:identity", { playerId });
  const onRoomCreated = (roomId) => emit("room:created", roomId);
  const onRoomReady = (payload, ack) => {
    emit("room:ready", payload);
    ack?.({ status: "ok" });
  }
  const onRoomStarting = payload => emit("room:starting", payload);
  const onTimeUpdate = (payload) => emit("room:time", payload);
  const onRoomState = (state) => emit("room:state", state);
  const onCycleFound = (payload) => emit("room:cycle", payload);
  const onDrawRequested = payload => emit("room:draw:requested", payload);
  const onDrawStatus = payload => emit("room:draw:status", payload);
  const onRematchRequested = payload => emit("room:rematch:requested", payload);
  const onRematchStatus = payload => emit("room:rematch:status", payload);
  const onPlayerOffline = (r) => emit("player:offline", r);
  const onPlayerLeft = (r) => emit("player:left", r);
  const onDisconnect = (r) => emit("net:disconnect", { reason: r });

  sock.on("connect", onConnect);
  sock.on("identity", onIdentity);
  sock.on('roomCreated', onRoomCreated);
  sock.on("roomReady", onRoomReady);
  sock.on("roomStarting", onRoomStarting);
  sock.on("roomTime", onTimeUpdate);
  sock.on("roomStateUpdated", onRoomState);
  sock.on("cycleFound", onCycleFound);
  sock.on("drawRequested", onDrawRequested);
  sock.on("drawStatus", onDrawStatus);
  sock.on("rematchRequested", onRematchRequested);
  sock.on("rematchStatus", onRematchStatus);
  sock.on("playerOffline", onPlayerOffline);
  sock.on("playerLeft", onPlayerLeft);
  sock.on("disconnect", onDisconnect);

  // teardown
  return () => {
    sock.off("connect", onConnect);
    sock.off("identity", onIdentity);
    sock.off('roomCreated', onRoomCreated);
    sock.off("roomReady", onRoomReady);
    sock.off("roomStarting", onRoomStarting);
    sock.off("roomTime", onTimeUpdate);
    sock.off("roomStateUpdated", onRoomState);
    sock.off("cycleFound", onCycleFound);
    sock.off("drawRequested", onDrawRequested);
    sock.off("drawStatus", onDrawStatus);
    sock.off("rematchRequested", onRematchRequested);
    sock.off("rematchStatus", onRematchStatus);
    sock.off("playerOffline", onPlayerOffline);
    sock.off("playerLeft", onPlayerLeft);
    sock.off("disconnect", onDisconnect);
  };
}
