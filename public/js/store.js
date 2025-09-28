import { getRoomIdFromURL } from "./sock.js";

const state = {
    roomId: null,
    roomReady:false,
    sockID: null,
    playerName: null,
    mark: null,
    host: false,
}

const listeners = new Set();

export function getState(){
    return {...state}
}

export function patchState(patch) {
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (state[k] !== v) { state[k] = v; changed = true; }
  }
  if (changed) listeners.forEach(fn => fn(getState()));
}

export function subscribe(fn) {
  listeners.add(fn);
  // call once with current
  fn(getState());
  return () => listeners.delete(fn);
}


export function getOrMakePlayerId() {
  const k = "playerId";
  let id = localStorage.getItem(k);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(k, id);
  }
  return id;
}

export const getSockID = () => state.sockID;
export const setSockID = (id) => patchState({ sockID: id });


function setRoomURL(id) { 
  history.replaceState({}, '', `/multiplayer/room/${id}`); // change URL without reload
}


export const getRoomId = () =>  sessionStorage.getItem("roomId") || getRoomIdFromURL() || state.roomId || null;
export const setRoomId = (id) => {
    patchState({ roomId: id });
    sessionStorage.setItem("roomId", id);
    setRoomURL(id);
}

export const getRoomReady = () => state.roomReady;
export const setRoomReady = (ready) => patchState({ roomReady: ready });



export const getPlayerName = () => state.playerName;
export const setPlayerName = (name) => {
    patchState({ playerName: name });
console.log(`Players ${getMark()}'s name set to ${name}`)}

export const getMark = () => state.mark;
export const setMark = (mark) => {patchState({ mark }); return mark}