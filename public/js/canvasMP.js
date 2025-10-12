import { MainView, GameView, ErrorView } from "./View.js";
import { ViewManager } from "./View.js";

import { onCollapseChoice, hideWaitOverlay, showWaitOverlay, addButton, drawBoard} from "./gameUI.js";
import { Atom, clearPage, createCollapseRect, drawWinningLine, Text, x, y} from "./drawGame.js";
import { sock } from "./sock.js";
import { sendCollapse, sendMove } from "./emitters.js";
import { on } from "./bus.js";
import { wireSocketToBus } from "./wireHandlers.js";
import { withAck } from "./withAck.js";


import { getOrMakePlayerId, getRoomId, getNextAction, getMark,
     setOnCellClick, setMark, setRoomId , setRoomReady, setTurn, setOpponentName, setBoard, setNextAction,
     setOnSymbolClick,
     setGameStatus,
     setPlayerName,setHost,
     setView,
     setCyclePath,
     setWinningLine,
     setWinner
     } from "./store.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/css/style.css";
document.head.appendChild(link);

const canvas = document.querySelector('canvas');

window.addEventListener('resize', () => {
    canvas.width = (window.innerWidth);
    canvas.height = (window.innerHeight); // doesn't currently work
});

wireSocketToBus();
export const vm = new ViewManager();
const MainViewRef = vm.register(MainView);
const GameViewRef = vm.register(GameView);
const ErrorViewRef = vm.register(ErrorView);

vm.connect();


//getOrMakePlayerId();

/*
function serializeRoomState(room) {
  return {
    board: room.state.board,
    turn: room.state.turn,
    winner: room.state.winner,
    winningLine: room.state.winningLine,
    boardHistory: room.boardHistory,
    status: room.state.status,
    players: room.players}
  }*/ 

const parseState = (s) => { 
    JSON.parse(JSON.stringify(s));
    setBoard(s.board);
    setTurn(s.turn);
    //setRoomReady(true);
    //setNextAction(s.nextAction);
    setGameStatus(s.status);

} // simple deep clone




const onConnect = on('net:connect', async () => {

    //setRoomId();
    const url = new URL(window.location.href).toString();
    const arrurl = url.split("/");
    console.log(arrurl);
    if(arrurl[arrurl.length - 2]==="room"){
        
            const ack = await withAck('resumeOrHello', {roomId: getRoomId() || arrurl[arrurl.length - 1]});

            const state = ack.state;
            console.log(ack);

            if (!ack || ack.status === 'roomGone') {
                console.log("This game does not exist or has ended. Please start a new game.");
                vm.switchView(ErrorView);
                return;
            }

            const roomId = setRoomId(ack.roomId);

            const board = setBoard(state.board);
            if(!board){
                setGameStatus('error');
                console.log("Error: unable to resume or join game. Game state is unretrievable. Please start a new game.");
                return;
            }



            const mark = setMark(ack.mark);
            if(!mark){
                setGameStatus('error');
                console.log("Error: unable to resume or join game. Please start a new game.");
                return;
            }
            const players = ack.players;
            setOpponentName(mark==="X"?players.O?.playerName : players.X?.playerName);
            setPlayerName(mark==="X"?players.X?.playerName : players.O?.playerName);
            


            if(ack?.status === 'finished'){
                setGameStatus('finished');
                return;
            } else if(ack?.status === 'waiting'){
                setGameStatus('waiting');
            } else if(ack?.status === 'resumed'){
                setGameStatus('playing');
                setNextAction(state.nextAction);
                setCyclePath(state.cyclePath);
                setTurn(state.turn);
                setRoomReady(true);
                
                switch(state.nextAction){
                    case "move":
                        setOnCellClick(getMark() !== state.turn ? null : sendMove);
                        break;
                    case "collapse":
                        setOnSymbolClick(getMark() !== state.turn ? null : sendCollapse);
                        break;
                    case "winner":
                        setWinner(state.winner);
                        setWinningLine(state.winningLine);
                        setGameStatus('finished');
                        break;
                    default:
                        console.warn("dafuq!");
                }
            };

            
            //setOnCellClick(sendMove);
            vm.switchView(GameView);
    }
    else if (arrurl[arrurl.length - 1]==="multiplayer"){
        vm.switchView(MainView);
        return;
        }

    console.log(`Connected to server Player ID: ${getOrMakePlayerId()} || RoomId: ${getRoomId()}`)
     
    

    
    

});


const roomCreated = on("room:created", (data) => {
    const {roomId, board} = data;
    console.log("room created: ", roomId);
    if(roomId){
    setRoomId(roomId);
    setMark("X");
    setHost(true);
    setBoard(board);
    setGameStatus("waiting");
    vm.switchView(GameView);
}

});


const roomRequested = on('room:match:requested', (ack) => {
    if(ack?.status === 'ok'){
        vm.switchView(GameView);
    }
})

const roomReady = on('room:ready', (data)=> {
    const {roomId, state, players} = data;
    console.log(state);
    
    setRoomId(roomId);
    //setMark(mark);
    setTurn(state.turn);
    setBoard(state.board);
    setNextAction(state.nextAction);
    setGameStatus("playing");
    setOpponentName(getMark()==="X"?players.O?.playerName : players.X.playerName);
    setRoomReady(true);
    setView("game");
    setOnCellClick(getMark() !== state.turn ? null : sendMove);
    //vm.switchView(GameView);
})

const moveSent = on('room:move:sent', (bigSquare, ack) => {
    /*console.log(bigSqaure);
    console.log(ack.status);
    console.log(ack.message);*/
})

const roomStateUpdated = on('room:state', (data) => {
        console.log(data);
        const {state}  = data
        console.log(state);
        console.log(state.board);
        setBoard(state.board);
        setTurn(state.turn);
        setView('game');
        
        
        if(state.winner){
            setWinner(state.winner);
            setWinningLine(state.winningLine);
            setGameStatus('finished');
            //setNextAction('winner');
        }
        setRoomReady(true);
        setOnCellClick(getMark() !== state.turn ? null : sendMove);
        setNextAction(state.nextAction);

})

const cycleFound = on('room:cycle', (data) => {
    const {cyclePath,state} = data;
    setTurn(state.turn);
    setBoard(state.board);
    setNextAction(state.nextAction);
    setCyclePath(cyclePath);
    setView('game');
    //GameView.showCollapseSquares(cyclePath);
    setOnSymbolClick(getMark() !== state.turn ? null : sendCollapse);
    setOnCellClick(()=>{});
})

const playerOffline = on('player:offline', (data) => {
    const {mark, playerId, playerName} = data;
    console.log(`${playerName} went offline`);
    setOnCellClick(()=>{});
    setOnSymbolClick(()=>{});

});

const playerLeft = on('player:left', (data) => {
    const {mark, playerName} = data;
    console.log(`Player ${playerName} left the game`);
    GameView.setOnCellClick(()=>{});
    GameView.setOnSymbolClick(()=>{});
    GameView.setReady(false);
});

const disconnected = on('net:disconnect', ({reason}) => {
    console.log("Disconnected: ", reason);
    setRoomReady(false);

    setOnCellClick(()=>{});
    setOnSymbolClick(()=>{});

    //showWaitOverlay("Disconnected. Retrying...");
    onConnect();
    roomRequested();
    roomCreated()
    roomReady()
    moveSent();
    roomStateUpdated();
    cycleFound();
    playerOffline();
    playerLeft();

});




let boxHeight = 500
let boxWidth = 500



//------------------------------------------
let atomArray = [];
let j, i;
let shift;
i=0;
shift=15;
while(i<65){
    let atomX = Math.random()*canvas.width*0.95 ;
    let atomY = Math.random()*canvas.height*0.95;
    let colour = Math.random() > 0.5 ? "grey" : "black";
    if(atomY > y - shift && atomY < y + boxHeight+shift && atomX > x-shift && atomX < x + boxWidth+shift){
        continue
    }
    else{
    atomArray.push(new Atom(atomX, atomY, Math.random()*0.5, Math.random()*0.5, 30, colour));
    i++;
}
}



function animate(){
    requestAnimationFrame(animate);
    clearPage();
    for(const atom of atomArray){
        atom.update();
    }
    return cancelAnimationFrame(animate);
}
const cancelAnimation = animate();

/*addButton(window.innerWidth/2,window.innerHeight/2,"Quick Game",quickMatch);
addButton(window.innerWidth/2,window.innerHeight/2+65,"Join Game",()=>{});*/