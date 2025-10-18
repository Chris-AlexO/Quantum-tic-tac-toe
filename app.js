const path = require('path');
const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const { Server } = require('socket.io');
const app = express();
const port = process.env.PORT || 3000;

// Serve everything in /public at root (/, /js/..., /css/...)
app.use(express.static(path.join(__dirname, 'public')));

// If you want nice routes like /local and /multiplayer
app.get('/local', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'local.html'));
});
app.get('/multiplayer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'multiplayer.html'));
});

app.get('/multiplayer/room/:id', (req, res) => {
  // (Optional) validate UUID / existence here and redirect if bad.
  res.sendFile(path.join(__dirname, 'public', 'multiplayer.html'));
});

/// health check (for hosts + sanity)
app.get('/healthz', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});


const winner = [[1,2,3], [4,5,6], [7,8,9], [3,6,9], [2,5,8], [1,4,7], [1,5,9], [3,5,7]];
const rooms = new Map();
const hostIndex = new Map();
const playerIndex = new Map();
let waitingPlayer = null;
let currentCyclePath = null;



function updateBoard(board, square, symbol) { 
    
    const newBoard = [...board];

        for(let i = 0; i<9; i++){
            if(newBoard[square][i]===null){
                newBoard[square][i]=symbol; 
                break;
            }}

    return newBoard;
}

function checkIfOneSquareRemains(room){
    const board = room.state.board;
    const turn = room.state.turn;
    let count = 0;
    let lastSquare = null;
    for(let i=0; i<board.length;i++){
        if(board[i]===null){
            count++;
            lastSquare=i;
        }
    }
    if(count===1){
        board[lastSquare] = turn;
    }

    return board

}

function serializeRoomState(room) {
  return {
    board: room.state.board,
    turn: room.state.turn,
    winner: room.state.winner,
    winningLine: room.state.winningLine,
    boardHistory: room.boardHistory,
    status: room.state.status,
    players: room.players,
    nextAction: room.state.nextAction,
    cyclePath: room.state.cyclePath,
    xTimeLeft: room.players.X?.timeLeft,
    oTimeLeft: room.players.O?.timeLeft}
  }


function attachSocketToMark(roomId, mark, socket) {
  const room = rooms.get(roomId);
  room.players[mark].socketId = socket.id;
  playerIndex.set(socket.playerId, { roomId: roomId, socketId: socket.id, mark: mark });
  socket.join(roomId);
}


function createRoom(sock, data={roomName:`Room${rooms.size+1}`, playerName:"Player1"}){
        
        const {roomName, playerName} = data;
        const roomId = uuidv4();
        const gameBoard = Array.from({length: 9}, () => 
            Array.from({length:9}, ()=> null)
        );

        
        rooms.set(
            roomId,
            {   
                name:roomName || 'testRoom',
                host: sock.playerId,
                mode: 'ChrisOuff' || "AllanGoff",
                players:{
                    X: {playerId:sock.playerId, socketId:sock.id, playerName: playerName, timeLeft:600},
                    O: null
                },
                state:{
                    board:gameBoard,
                    turn:'X',
                    moves:[],
                    symbolIndex: new Map(),
                    started:false,
                    winner:null,
                    status:"waiting", //"playing", "finished"
                    nextAction:null,
                    cyclePath:null,
                    winningLine:null,
                },
                boardHistory: [],
                timeouts: {},
                timeoutIntervals: {},
                timerId: null,
            }
        )

        hostIndex.set(
            sock.playerId,
            roomId
        )

        playerIndex.set(
            sock.playerId,
            {roomId: roomId, socketId: sock.id, mark: 'X'}
        )

        sock.join(roomId);
        return roomId
    }


function findSeat(room, playerId) {
  if (room.players.X?.playerId === playerId) return "X";
  if (room.players.O?.playerId === playerId) return "O";
  return null;
}


io.use((socket, next) => {
  const { playerId, roomId, mark } = socket.handshake.auth || {};
  socket.playerId = playerId || uuidv4(); // fallback, but client should send
  socket.initialRoomId = roomId || null;
  socket.mark = mark;
  next();
});


io.on('connection', (sock) => {
    console.log("someone connected: ", sock.playerId);

    sock.on("resumeOrHello", ( payload  = {}, ack) => {
    // Case A: client sent a roomId (from URL/session)
    if(!payload) return ack?.({status:'error', message:"no payload"});
    const {urlRoomId} = payload;

    // Case B: playerIndex knows where they were, but client didn’t send roomId
    const rec = playerIndex.get(sock.playerId);
    const backupRoomId = rec?.roomId;
    
    const roomId = urlRoomId || backupRoomId;

    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      // Is this player part of it already?
      const mark = findSeat(room, sock.playerId);

      if (mark) {
        // clear any pending cleanup
        if (room.timeouts[sock.playerId]) {
        console.log(`clearing timeout for`, sock.playerId);
          clearTimeout(room.timeouts[sock.playerId]);
          clearInterval(room.timeoutIntervals[sock.playerId]);
          delete room.timeouts[sock.playerId];
          delete room.timeoutIntervals[sock.playerId];
        }
        attachSocketToMark(roomId, mark, sock);

        if(room.state && room.state.status==="waiting"){
            waitingPlayer=sock.playerId;
             //io.to(roomId).emit("playerRejoined", { mark, playerId: sock.playerId });
             return ack?.({ status: "waiting", roomId: roomId, mark: mark, state: serializeRoomState(room), players: room.players });
        } else if (room.state && room.state.status==="playing"){   
            io.to(roomId).emit("playerRejoined", { mark, playerId: sock.playerId });
            return ack?.({ status: "resumed", roomId: roomId, mark: mark, state: serializeRoomState(room), players: room.players });
        } else if (room.state && room.state.status==="finished"){
            return ack?.({ status: "finished", roomId: roomId, mark: mark, state: serializeRoomState(room), players: room.players });
        }        
      }
    }

    // Case C: fresh or room gone
    console.log(rooms);
    const room = rooms.get(roomId);
    const state = room ? room.state : null;
    if(!room){
    ack?.({ status: "roomGone", roomId: null });
    }else{
        ack?.({status: 'error', message:"Room still exists but player unable to join"});
    }
  });

    

    sock.on('createRoom', (data, ack) => {
        const [roomName, playerName] = data
        const roomId = createRoom(sock, data);
        if(roomId){
        ack?.({status:'ok', roomId:roomId, name:rooms.get(roomId).name, mark:"X"}); //Don't need to send mark:"X" here. For safe measure I guess.
        }
        else{
            ack?.({status:'error', message: "couldn't create a room"});
        }
    });

    sock.on('joinSpecificRoom', ({roomId}, ack) => {
        const room = rooms.get(roomId);
        if(!room) return ack({status:'error',message:'No room with Id:'});
        
        sock.join(roomId)
        if(!room.players.O && room.players.X !== sock.id){
            room.players.O = sock.id;

            io.to(roomId).emit("roomReady", {roomId});
        }
        ack?.({status:'ok', roomId})
    });

    sock.on('joinReadyRoom', (data, ack) => {
        //console.log('quick match request recieved by backend');
        if(rooms.size > 50) {
            return ack?.({status:'error', message:'Server too busy, try again later'});
        }

        const { playerName }  = data;
        const rec = playerIndex.get(sock.playerId);
        const currentRoomId = rec?.roomId;
        const mark = rec?.mark;
        if(currentRoomId) {
            console.log(`Number of rooms: ${rooms.size}`);
            const room = rooms.get(currentRoomId);
            return ack?.({status:'alreadyRoom', 
                message:'Player already in a room', 
                roomId:currentRoomId,
                mark:mark,
                status: room.state.status,
                state: serializeRoomState(room)});}

        if(waitingPlayer && waitingPlayer!==sock.playerId){ // if there's a waiting player, join their room
            console.log(`found player: ${waitingPlayer}`)
            const waitingPlayerId = waitingPlayer;
            waitingPlayer=null;

            const roomId = hostIndex.get(waitingPlayerId);
            if(!roomId || !rooms.has(roomId)) return ack?.({status:'error', message:`host doesn't have a room`})

            sock.join(roomId);
            const room = rooms.get(roomId);
            room.players.O = {playerId:sock.playerId,socketId:sock.id, playerName:playerName, timeLeft:600};
            playerIndex.set(sock.playerId, { roomId: roomId, socketId: sock.id, mark: 'O' });
            room.state.started=true;
            room.state.status="playing";
            room.state.nextAction="move";
            io.to(roomId).emit("roomReady", {roomId: roomId, state:serializeRoomState(room), players:room.players});

            room.timerId = setInterval(() => {
                    room.players[room.state.turn].timeLeft--;

                    /*io.to(roomId).emit("time", {
                        players: room.players,
                         xTimeLeft: room.players.X.timeLeft,
                         oTimeLeft: room.players.O.timeLeft});*/

                    if(room.players[room.state.turn].timeLeft<1){
                            room.state.winner = room.players[room.state.turn] === 'X' ? 'O' : 'X'
                            clearInterval(room.timerId);
                    }
            }, 1000);

            return ack?.({status:'ok', mark:"O", message:'joined room'});

        }else{ // if no waiting player, current socket user becomes waiting player by creating a room for themselves
            const roomId = createRoom(sock, {playerName:playerName});
            console.log(`Number of rooms: ${rooms.size}`)
            //console.log(`No rooms found so creating room ${roomId}`);
            waitingPlayer=sock.playerId;
            const board = rooms.get(roomId).state.board;
            io.to(roomId).emit("roomCreated", {roomId: roomId, board: board});
            ack?.({status: 'ok', mark:"X",message:'created room'}); //Don't need to send mark:"X" here. For safe measure I guess.
        }
    });

    //Checks room ,if square full, returns room state
    sock.on('move', (data, ack)=> {

        const [roomId, player, move] = data;
        const bigSquare = move;


        const room = rooms.get(roomId);
        if(!room) return ack?.({status:'error', message:'Room not found'});

        const board = room.state.board;
        const turn = room.state.turn;
        const symbolIndex = room.state.symbolIndex;

        //const insertSymbol = (square, symbol) => {for(let i = 0; i<9; i++){if(board[square][i]===null){board[square][i]=symbol; break;}} };

        if(!room) return ack?.({status:'error', message:'room not found in Map'});
        if(turn !== player) return ack?.({status:'error', message:`Not player's ${player} turn!`});
        if(room.state.moves.length % 2 !== 0 && bigSquare===room.state.moves[room.state.moves.length-1]){return ack?.({status:'error', message:"Can't place mark in same square twice!"})};
        if(board[bigSquare][9]) return ack?.({status:'error', message:'Square full!'});
        if(!Array.isArray(board[bigSquare])) return ack?.({status:'error', message:'Square has already collapsed'});

        const totalMoves = room.state.moves.push(bigSquare);
        const symbol = player + Math.ceil(totalMoves/2).toString()

        //insertSymbol(bigSquare,symbol);
        const newBoard = updateBoard(board, bigSquare, symbol);
        room.state.board = newBoard;
        room.boardHistory.push(JSON.parse(JSON.stringify(newBoard)));
        

        if(symbolIndex.has(symbol)){
            symbolIndex.get(symbol).push(bigSquare);
        }else{
            symbolIndex.set(symbol, [bigSquare]);
        }

        console.log(`total moves ${totalMoves}`);

        if(totalMoves % 2 !== 0) {
            io.to(roomId).emit('roomStateUpdated', {state: serializeRoomState(room)})
            return ack?.({status:'ok', message:`move made new board ${board}`});}

        //Other player's turn
        room.state.turn = player==='X' ? 'O' : 'X';

        //This will be target square (second to last square symbol has been added to)
        //If you can somehow link the last square to the second to last square whilst searching through all cyclic iterations
        //Then you've found a cycle
        const bigSquareofTwin = room.state.moves[totalMoves - 2];
        

        const tempMoves = room.state.moves;
        
        const stack = [{currentIdx:totalMoves-1, currentSquare: bigSquare, currentSymbol:symbol, path:[[bigSquare, symbol]] }];
        const visitedIdxs = new Set();

        let foundCycle = false;
        let cyclePath = [];
        
        //While loop checks if there's a cycle (collapsible QT entanglement)
        while(stack.length > 0 && !foundCycle){
            const {currentIdx, currentSquare, currentSymbol, path} = stack.pop();
            for(let i=0; i<totalMoves; i++){
                //console.log("i: ",i);
                //console.log("current square: ", currentSquare);
                

                if(i===currentIdx) continue;
                console.log("symbol to check ",i ," ", tempMoves[i]);
                //console.log("Looking for",currentSymbol);
                
                if(tempMoves[i] === currentSquare){
                    if(visitedIdxs.has(i)) {continue;} else{visitedIdxs.add(i);}
                    //find twin and check if it's in target square. If not, run same check for every other symbol in twin's square.
                    const moveSymbol = (((i >> 1) % 2 === 0) ? 'X' : 'O') + (Math.floor(i/2) + 1).toString();
                    console.log("moveSymbol to check ",i ," ", moveSymbol);
                    const twinIdx = i % 2 === 0 ? i + 1  : i - 1;
                    const twinSquare = tempMoves[twinIdx];

                 // should ideally have [...path, [currentSquare, moveSymbol]] before this
                    if(twinSquare=== bigSquareofTwin){
                        const newPath = [...path, [twinSquare, moveSymbol]]
                        foundCycle=true;
                        cyclePath=newPath;
                        currentCyclePath = cyclePath;
                        //console.log(tempMoves);
                        console.log(cyclePath);
                        room.state.cyclePath = cyclePath;
                        room.state.nextAction='collapse';
                        io.to(roomId).emit('cycleFound', ({cyclePath: cyclePath, state: serializeRoomState(room)}))
                        return ack?.({status:'ok'});
                    }else{
                        console.log(moveSymbol);
                        const newPath = [...path, [twinSquare, moveSymbol]]
                        stack.push({currentIdx: twinIdx, currentSquare: twinSquare, currentSymbol:moveSymbol, path:newPath})
                    }

                };}//For loop end
        }//While loop end

        console.log('Updating board state after move');
        io.to(roomId).emit('roomStateUpdated', ({state: serializeRoomState(room)}));
        return ack?.({status:'ok', message:'Last',roomId: roomId});
    });

    sock.on('collapse', (data, ack) => {

  
        const path = currentCyclePath;

        const {roomId, square, playerSymbol, player} = data;

        console.log(`Collapse recieved. Datat: ${JSON.stringify(data)}`);

        const room = rooms.get(roomId);
        if(!room) return ack?.({status:'error', message:'room not found'});
        
        const board = room.state.board;
        if(!Array.isArray(board) || board.length !=9) return ack?.({status:'error', message:'invalid board'} );
        if(!path.map(a => a[0]).includes(square)) return ack?.({status:'error', message:`square ${square} is not collapsible`})

        const symbolIndex =  room.state.symbolIndex;    

        const collapsedSymbols = new Set();

        // Helper: is this cell already classical?
        const isClassical = (cell) => typeof cell === 'string';

        // Helper: collapse a square to the classical player's mark ('X' or 'O')
        const classicalOf = (quantumToken) => quantumToken.charAt(0);


        const stack = [{currentSquare: square, currentSymbol: playerSymbol}]

        //While loop handles collapsing of bigSquares after player selects intial square to collapse
        while(stack.length>0){

            const {currentSquare, currentSymbol} = stack.pop()
            if(isClassical(board[currentSquare])) continue;

            for(let j = 0; j<9; j++){
                //Loop through all symbols in last bigSquare. Collapse their twins.
                if(board[currentSquare][j] === null) break;
                const symbol = board[currentSquare][j];
                
                if(collapsedSymbols.has(symbol)) continue;
                if(symbol === currentSymbol)continue;
                
                const [firstTwinSquare, secondTwinSquare] = symbolIndex.get(symbol);
                const twinToCheck = firstTwinSquare === currentSquare ? secondTwinSquare : firstTwinSquare;

                stack.push({currentSquare:twinToCheck, currentSymbol: symbol});
            }
            board[currentSquare] = currentSymbol.length>1 ? currentSymbol.charAt(0) : currentSymbol;
            collapsedSymbols.add(currentSymbol);
        }

        room.state.board = checkIfOneSquareRemains(room);



        //After collapsing, check if there is a winner
        //let foundWinner = null;
        const winningLine = [];
        const winningLines = [];
        for(const win of winner){
            const sq1 = room.state.board[win[0]-1];
            const sq2 = room.state.board[win[1]-1];
            const sq3 = room.state.board[win[2]-1];
            if(typeof sq1 === 'string' && sq1===sq2 && sq2===sq3){
                //foundWinner=sq1.charAt(0);
                winningLine.push(win);
                winningLines.push(sq1.charAt(0));
            }
        }

        if (winningLines.length){
            const a = winningLines[0]
            const allEqual = winningLines.every(v => v === a);
            room.state.winner= allEqual ? a : 'draw';
            room.state.winningLine=winningLine;
            room.state.nextAction = "winner";
        }else {
            room.state.winner=null;
             room.state.nextAction = "move";
            //room.state.turn = player === 'X' ? 'O' : 'X';
            room.state.cyclePath=null;
        }
            
        io.to(roomId).emit('roomStateUpdated', {state: serializeRoomState(room)});
        return ack?.({status:'ok', message:'collapse'});


    });

    sock.on('rematch', ({roomId}, ack) => {
        const room = rooms.get(roomId);
        room.state.board = Array.from({length: 9}, () => 
            Array.from({length:9}, ()=> null)
        );

        room.state.turn = 'X'; // eventually make the players swap
        io.to(roomId).emit('roomStateUpdated', {state: serializeRoomState(room)});
        

    });

    sock.on('disconnect', (ack) => {
        console.log("disconnected: ", sock.id, "player: ", sock.playerId);
        const rec = playerIndex.get(sock.playerId);
        if (!rec) return; // wasn't in a room

        if(waitingPlayer===sock.playerId) waitingPlayer=null;//Remove this player as waiting player once they cut

        const room = rooms.get(rec.roomId);
        if (!room) {
        playerIndex.delete(sock.playerId);
        return;
        }

        /*if(room.status==="waiting"){
            for(const [k,v] of Object.entries(room.timeouts)){
            clearTimeout(room.timeouts[k]);
            }

            for(const [k,v] of Object.entries(room.timeoutIntervals)){
                clearInterval(room.timeoutIntervals[k]);
            }
            clearInterval(room.timerId);

            rooms.delete(room.roomId);
            if(hostIndex.has(sock.playerId)){
                hostIndex.delete(sock.playerId);
            }
        }*/

        const mark = findSeat(room, sock.playerId);

        //Should really wait like 0.5 seconds before emitting playerOffline
        //In case they just refreshed or something
        io.to(room.roomId).emit("playerOffline", { mark: mark, playerId: sock.playerId, playerName: room.players[mark]?.playerName });
        console.log(`${Date.now()} someone disconected: ${sock.playerId}, they were in room ${rec.roomId} as ${rec.mark}`);

        
        if(room.timeouts[sock.playerId] && !room.timeoutIntervals[sock.playerId]){
            room.timeoutIntervals[sock.playerId] = setInterval(() => {
                io.to(room.roomId).emit("playerTimeoutWarning", { mark: mark, playerId: sock.playerId, playerName: room.players[mark]?.playerName });
                console.log(`${Date.now()}emitting timeout warning to room`, room.roomId);
            }, 1000);
            return;} // already waiting to be cleaned up

        else if (!room.timeouts[sock.playerId] && !room.timeoutIntervals[sock.playerId]){
        room.timeouts[sock.playerId] = setTimeout(() => {
            delete room.timeouts[sock.playerId];

            const leftName = room.players[mark]?.playerName;
            console.log(`${Date.now()} removing player ${sock.playerId} (${leftName}) from room ${room.roomId}`);
            room.players[mark] = null;
            playerIndex.delete(sock.playerId);
            

            const otherPlayer =
        (room.players.X && room.players.X.socketId) ||
        (room.players.O && room.players.O.socketId);

            if (!otherPlayer) {

        for(const [k,v] of Object.entries(room.timeouts)){
            clearTimeout(room.timeouts[k]);
        }

        for(const [k,v] of Object.entries(room.timeoutIntervals)){
            clearInterval(room.timeoutIntervals[k]);
        }
        clearInterval(room.timerId);

        ; // both gone → delete room
        console.log(`deleting room ${room.roomId} as both players have left`);
        rooms.delete(room.roomId);
        if(hostIndex.has(sock.playerId)){
            hostIndex.delete(sock.playerId);
        }
      } else {
        io.to(room.roomId).emit("playerLeft", { mark: mark, playerName:leftName });
      }
        }, 30000);
    }


    });


});

server.listen(port, ()=>console.info("listening on port"));
//server.listen(port, () => console.info(`Listening on http://localhost:${port}`));