import { v4 as uuidv4 } from "uuid";
import C from "./constants.js";




export function createRoom(store, hostSocket, roomName="Default", type = C.ROOM_TYPE.LOCAL ) {
  const roomId = uuidv4();

  

  store.rooms.set(roomId, {
    id: roomId,
    name: roomName,
    host: hostSocket.playerId,
    type: type, //C.ROOM_TYPE.LOCAL,
    players: {
      X: { playerId: hostSocket.playerId, 
        socketId: hostSocket.id, 
        playerName: hostSocket.playerName, 
        timeLeft: C.TIME.TURN_SECONDS,
      connectionStatus: 'connected' },
      O: {}
    },
    boardHistory: [],
    state: {
      board: Array.from({ length: C.BOARD_SIZE }, () =>
        Array.from({ length: C.INNER_BOARD_SIZE }, () => null)
      ),
      turn: "X",
      status: C.ROOM_STATUS.WAITING,
      nextAction: null,
      winner: null,
      winningLine: null,
      cyclePath: null,
      symbolIndex: new Map(),
    },
    timers: {},
    timeouts: {},
    timeoutIntervals: {}
  });

  store.hostIndex.set(hostSocket.playerId, roomId);
  store.playerIndex.set(hostSocket.playerId, { roomId: roomId, socketId: hostSocket.id, mark: "X" });

  return roomId;
}

export function checkRoomReady(room, store){
  //Check room has host
  const hostPlayerId = room.host
  const error = (msg) => {return {status: "ERROR", message: msg}};

  const checkPlayerData = (players) => {
    if(!players.X) return error("Player X not in game");
    if(!players.O) return error("Player O not in game");

    if(!players.X.playerId) return error("Player X does not have a playerId");
    if(!players.O.playerId) return error("Player O does not have a playerId");

    if(!players.X.playerName) return error("Player X does not have a player name");
    if(!players.O.playerName) return error("Player O does not have a player name");

    if(!players.X.timeLeft) return error("Player X does not have a time");
    if(!players.O.timeLeft) return error("Player O does not have a time");

    if(!players.X.connectionStatus) return error("Player X does not have a connection status");
    if(!players.O.connectionStatus) return error("Player O does not have a connection status");

    return {status: "GOOD"};
  }

  if(!store.hostIndex.has(hostPlayerId)) return error("Host player index");
  if(!store.playerIndex.has(hostPlayerId)) return error("Player index error");
  if(!room.roomName) return error("Room does not have a name");
  if(!room.type) return error("Room does not have a type")
  
  const playersCheck = checkPlayerData(room.players);
  if(playersCheck.status==="ERROR") return playersCheck;

  if(room.state.status !== C.ROOM_STATUS.WAITING) return error(`Game in a status of ${room.state.status} not in a status of waiting`)

  return {status: "ok"}
}


export function findSeat(room, playerId) {
  if (room.players.X?.playerId === playerId) return "X";
  if (room.players.O?.playerId === playerId) return "O";
  return null;
}

export function findRoom(player) {
  
}


export function attachSocketToMark(room, mark, socket) {
  room.players[mark].socketId = socket.id;
  let rec = playerIndex.get(socket.playerId);
  if(!rec){
    playerIndex.set(socket.playerId, { roomId: room.id, socketId: socket.id, mark: mark });
  }
  rec.roomId = room.id;
  rec.socketId = socket.id;
  rec.mark = mark;
  
  socket.join(room.id);
}

function joinQuickMatch(store, socket, { playerName }) {
  if (store.waitingPlayerId && store.waitingPlayerId !== socket.playerId) {
    const hostId = store.waitingPlayerId;
    store.waitingPlayerId = null;

    const roomId = store.hostIndex.get(hostId);
    const room = store.rooms.get(roomId);

    room.players.O = {
      playerId: socket.playerId,
      socketId: socket.id,
      playerName,
      timeLeft: C.TIME.TURN_SECONDS
    };

    store.playerIndex.set(socket.playerId, { roomId, mark: "O" });
    room.state.status = C.ROOM_STATUS.PLAYING;
    room.state.nextAction = C.NEXT_ACTION.MOVE;

    return { type: "JOINED", roomId, mark: "O" };
  }

  // no waiting host → create room
  const roomId = createRoom(store, socket, { playerName });
  store.waitingPlayerId = socket.playerId;

  return { type: "CREATED", roomId, mark: "X" };
}


export function clearRoomTimeouts(room, playerId) {

  clearTimeout(room.timeouts[playerId]);
  clearInterval(room.timeoutIntervals[playerId]);
  delete room.timeouts[playerId];
  delete room.timeoutIntervals[playerId];

}




export function deleteRoom(roomId, store) {

  const room = store.rooms.get(roomId);
  if (!room) return;
  
  const xPlayer = room.players.X;
  const yPlayer = room.players.O;
  const hostIndex = store.hostIndex;
  const playerIndex = store.playerIndex;

  if(hostIndex.has(xPlayer.playerId)){
    hostIndex.delete(xPlayer.playerId);
  }

  if(hostIndex.has(yPlayer.playerId)){
    hostIndex.delete(yPlayer.playerId);
  }

  if(playerIndex.has(xPlayer.playerId)){
    playerIndex.delete(xPlayer.playerId);
  }

  if(playerIndex.has(yPlayer.playerId)){
    playerIndex.delete(yPlayer.playerId);
  }

  // stop game tick timer
  if (room.timerId) {
    clearInterval(room.timerId);
    room.timerId = null;
  }

  // stop any per-player timeouts/intervals
  if (room.timeouts) {
    for (const t of Object.values(room.timeouts)) clearTimeout(t);
    room.timeouts = {};
  }
  if (room.timeoutIntervals) {
    for (const i of Object.values(room.timeoutIntervals)) clearInterval(i);
    room.timeoutIntervals = {};
  }

  store.rooms.delete(roomId);

}

export function startRoomTimer(room) {
  room.timerId = setInterval(() => {
    room.players[room.state.turn].timeLeft--;
    if (room.players[room.state.turn].timeLeft < 1) {
      room.state.winner = room.state.turn === "X" ? "O" : "X";
      clearInterval(room.timerId);
    }
  }, 1000);
}

export function validateClientRoomId(player, urlRoomId, roomManager){

  if(urlRoomId===null) return {status: "hello", room: null};

const urlRoom = roomManager.getRoom(urlRoomId);
const room = roomManager.getPlayerRoom(player);

if(room?.roomId !== urlRoom?.roomId){
  return {status: "error", message: "URL room and roomManager room do not match"};
}

return {status: "ok", room: room};

}

/*Returns whether player is playing in the room or is a spectactor*/
export function getPlayerMode(player, room){
  for(const [mark, p] of Object.entries(room.players)){
    if(p.playerId===player.playerId){
      return "Playing";
    }else{
      return "Spectating";
    }
  }
}

/*module.exports = {
  createRoom,
  findSeat,
  attachSocket,
  joinQuickMatch,
  clearTimeout
};*/
