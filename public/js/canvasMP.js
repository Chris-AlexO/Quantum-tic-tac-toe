import { MainView, GameView } from "./View.js";
import { ViewManager } from "./View.js";
import { onCollapseChoice, hideWaitOverlay, showWaitOverlay, addButton, drawBoard} from "./gameUI.js";
import { Atom, clearPage, createCollapseRect, drawWinningLine, Text, canvas, x, y} from "./drawGame.js";
import { sock } from "./sock.js";
import { sendCollapse, sendMove } from "./emitters.js";
import { on } from "./bus.js";
import { wireSocketToBus } from "./wireHandlers.js";
import { withAck } from "./withAck.js";


import { getMark, getPlayerName, getRoomId, setMark, setRoomId , setRoomReady, getOrMakePlayerId} from "./store.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/css/style.css";
document.head.appendChild(link);

getOrMakePlayerId();

let j, i;
let shift;



let currentRoomId = null;
let myMark = null;
let isRoomReady = null;
let iIsHost = null;
let board = null;
//
let roomIdEl = null;
let turnEl = null;
let winnerEl=null;
let myNameEl = null
let opponentNameEl = null;

const url = new URL(window.location.href).toString();
const arrurl = url.split("/");
console.log(arrurl);

wireSocketToBus();
    const vm = new ViewManager();
    const MainViewRef = vm.register(MainView);
    const GameViewRef = vm.register(GameView);


/*if(getRoomId()===arrurl[arrurl.length - 1]){
vm.switchView(GameView);
}else{
vm.switchView(MainView);
}*/

const onConnect = on('net:connect', async () => {

    
    console.log(`Connected to server Player ID: ${getOrMakePlayerId()} || RoomId: ${getRoomId()}`)
    
console.log(getRoomId());
     
    const ack = await withAck('resumeOrHello', {roomId: getRoomId()});


     if (!ack || (ack.status !== 'resumed' && !ack.state)) {
    vm.switchView(MainView);
    return;
  }


    const state = ack.state;
    console.log(ack);
    const mark = setMark(ack.mark);
    const players = ack.players;

    vm.switchView(GameView);
    

    roomIdEl = GameView.appendText('left',`Room: ${getRoomId()}`);
    myNameEl = GameView.appendText('right', "Name: " + (mark==="X"?players.X.playerName : players.O?.playerName ));
    opponentNameEl = GameView.appendText('right','Opponent: '+ (mark==="X"?players.O?.playerName : players.X.playerName));
    turnEl=  GameView.appendText('left', state.turn === mark ? "Your turn!" : "Opponent's turn!");
       

    GameView.updateState(state.board);
    GameView.setReady(true);
    setRoomReady(true);
    GameView.setOnCellClick(sendMove);


    

});


const roomCreated = on("room:created", (roomId) => {
    console.log(roomId);
    roomIdEl = GameView.appendText('left',`Room: ${roomId}`);

   myNameEl = GameView.appendText('right', "Name: " + getPlayerName());

    if(roomId){
    setRoomId(roomId);
    myMark = setMark("X");
    console.log("switching to GameView ", myMark);
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
    
    console.log(roomId);
    console.log(players);

    opponentNameEl = GameView.appendText('right','Opponent: '+ getMark()==="X"?players.O.playerName : players.X.playerName);

    
    if(myMark==='X'){
        GameView.setReady(true);
        setRoomReady(true);
        turnEl = GameView.appendText('left', "Your turn!");
        GameView.setOnCellClick(sendMove);
        GameView.setToken('X1');
        vm.switchView(GameView);
        
        
    }else{
        myMark = setMark("O")
        setRoomId(roomId);
        
        roomIdEl = GameView.appendText('left',`Room: ${roomId}`);
        myNameEl = GameView.appendText('right', getPlayerName());
        turnEl = GameView.appendText('left', "Opponent's turn!");

        vm.switchView(GameView);
    }
})

const moveSent = on('room:move:sent', (bigSqaure, ack) => {
    /*console.log(bigSqaure);
    console.log(ack.status);
    console.log(ack.message);*/
})

const roomStateUpdated = on('room:state', (state) => {
        console.log(state.board);
        GameView.updateState(state.board);

        turnEl.textContent = state.turn === getMark() ? "Your turn!" : "Opponent's turn!"
       

        if(state.winner){
            GameView.showWin(state.winningLine);
            GameView.setReady(false);
            turnEl.textContent = "Winner!";
        }


        GameView.setReady(true);
        setRoomReady(true);
        GameView.setOnCellClick(sendMove);
        GameView.talk();
        //GameView.setToken(getMark());
})

const cycleFound = on('room:cycle', (data) => {
    const {cyclePath,state} = data;
    const turn = state.turn;
    GameView.updateState(state.board);
    GameView.showCollapseSquares(cyclePath);
    
    if(turn===getMark()){
    console.log(cyclePath);
    GameView.setOnCellClick(()=>{});
    }else{
        GameView.setOnCellClick(()=>{});
        GameView.setOnSymbolClick(()=>{});
    }

    turnEl.textContent = "Cycle found!";
})






let boxHeight = 500
let boxWidth = 500

window.addEventListener('resize', () => {
    canvas.width = (window.innerWidth);
    canvas.height = (window.innerHeight); // doesn't currently work
})

//------------------------------------------
let atomArray = [];
i=0;
shift=15;
while(i<50){
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

    
}

animate();

/*addButton(window.innerWidth/2,window.innerHeight/2,"Quick Game",quickMatch);
addButton(window.innerWidth/2,window.innerHeight/2+65,"Join Game",()=>{});*/