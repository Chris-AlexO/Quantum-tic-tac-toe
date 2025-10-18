import { game } from "./gameLogic.js";
import { getRoomIdFromURL } from "./sock.js";
import { vm } from "./canvasMP.js";

const state = {
    roomId: null,
    roomReady:false,
    sockID: null,
    playerName: null,
    opponentName: null,
    playerTime: 600,
    opponentTime: 600,
    timeInterval:null,
    mark: null,
    host: false,
    board: null,
    cyclePath: null,
    turn: null,
    winner: null,
    winningLine: null,
    onCellClick: null,
    nextAction: null,
    gameStatus: null, // 'waiting', 'playing', 'finished', error
    onSymbolClick: null,
    playerConnectionStatus: 'connected', // 'connected', 'offline', 'left'
    opponentConnectionStatus: 'offline', // 'connected', 'offline', 'left', 'Searching for opponent...'
    vh: window.innerHeight,
    vw: window.innerWidth,
    toastMessage: null,
    modalMessage: null,
    view:null,
}

const listeners = new Set();
//listeners.add((s) => console.log("State changed:", s));

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

export const getGameStatus = () => state.gameStatus;
export const setGameStatus = (status) => {patchState({ gameStatus: status }); return status};

export const getPlayerName = () => state.playerName;
export const setPlayerName = (name) => {patchState({ playerName: name });}

export const getOpponentName = () => state.opponentName;
export const setOpponentName = (name) => {patchState({ opponentName: name });}

export const getMark = () => state.mark;
export const setMark = (mark) => {patchState({ mark: mark }); return mark}

export const setTurn = (turn) => patchState({ turn: turn });
export const getTurn = () => state.turn;

export const getBoard = () => state.board;
export const setBoard = (board) => {patchState({ board: board }); return board;}


export const getOnCellClick = () => state.onCellClick;
export const setOnCellClick = (fn) => patchState({ onCellClick: getTurn() === getMark() ? fn : ()=>{}});

export const getNextAction = () => state.nextAction;
export const setNextAction = (action) => {patchState({ nextAction: action }); return action;}

export const getOnSymbolClick = () => state.onSymbolClick;
export const setOnSymbolClick = (fn) => patchState({ onSymbolClick: getTurn() === getMark() ? fn : ()=>{}});


export const setWinner = (winner) => patchState({ winner: winner});
export const getWinner = () => state.winner;

export const getWinningLine = () => state.winningLine;
export const setWinningLine = (line) => patchState({ winningLine: line });

export const getToastMessage = () => state.toastMessage;
export const setToastMessage = (message) => patchState({ toastMessage: message });

export const setModalMessage = (message) => patchState({ modalMessage : message});
export const getModalMessage = () => state.modalMessage;

export const getView = () => state.view;
export const setView = (view) => patchState({ view: view });

export const setHost = (isHost) => patchState({ host: isHost });
export const getHost = () => state.host;

export const setCyclePath = (cyclePath) => patchState({cyclePath : cyclePath});
export const getCyclePath = () => state.cyclePath;

export const getPlayerTime = () => state.playerTime;
export const setPlayerTime = (time) => patchState({ playerTime : time});

export const getOpponentTime = () => state.opponentTime
export const setOpponentTime = (time) => patchState({ opponentTime : time});

export const getTimeInterval = () => state.timeInterval;
export const setTimeInterval = (timerId) => patchState({ timeInterval : timerId})




