import { sock } from "./sock.js";
import { withAck } from "./withAck.js";
import { emit } from "./bus.js";
import { getRoomId, getRoomReady, getMark, getPlayerName } from "./store.js";


// Ask server to create a room (you become host, and X)
export async function createRoom(roomName = "Room") {
  const ack = await withAck("createRoom", {roomName, name:getPlayerName()});
  currentRoomId = ack.roomId;
  myMark = "X"; // creator sits in X by default
  isRoomReady = false;
  showWaitOverlay?.(`Room created. Share code: ${currentRoomId}\nWaiting for opponent…`);
  return ack;
}


// Join a room by code
export async function joinRoomById(roomId) {
  const ack = await withAck("joinSpecificRoom", { roomId, name:getPlayerName() });
  currentRoomId = ack.roomId;
  myMark = "O"; // your backend assigns O if slot is free
  // Will get 'roomReady' once both connected
  return ack;
}

// Quick match
export async function quickMatch() {
    const playerName = getPlayerName()
    console.log(playerName);
    try{
      const ack = await withAck("joinReadyRoom", {playerName: playerName});
      emit("room:match:requested", ack);

  return ack;
    }
    catch(err){
        console.error("Join failed:", err);
    }
}

// Send a quantum move: bigSquare = 0..8, smallSquare = 0..8
export async function sendMove(bigSquare) {
  const currentRoomId = getRoomId();
  const isRoomReady = getRoomReady();

  if (!currentRoomId || !isRoomReady) return;
  const data = [currentRoomId, getMark(), bigSquare];
  try {  const ack = await withAck("move", data);
    emit("room:move:sent", { bigSquare, ack });
   }
  catch (e) { console.warn("Move rejected:", e); }
}

// Send a collapse choice after server emits 'cycleFound'
export async function sendCollapse(chosenBigSquare, mark) {
    const currentRoomId = getRoomId();
  if (!currentRoomId) return;
  try {
    const ack = await withAck("collapse", {
      roomId: currentRoomId,
      square: chosenBigSquare,     // 0..8
      playerSymbol: mark || getMark(), // e.g. "X7"
      //path: cyclePath || []
    });
    emit("room:collapse:sent", {chosenBigSquare, ack });
  } catch (e) {
    console.warn("Collapse rejected:", e);
  }
}

// Rematch
export async function requestRematch() {
    const currentRoomId = getRoomId;
  if (!currentRoomId) return;
  await withAck("rematch", { roomId: currentRoomId });
}
export function sendDetailsToOpponent(){
     const details = {name: getPlayerName()}

     return details
}