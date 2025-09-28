import { MainView, GameView } from "./View.js";
import { ViewManager } from "./View.js";
import { sock } from "./sock.js";

export function registerSockHandlers({getCurrentRoomId, board, onRoomReadyUI, onWinner}){

        const onConnect = () => console.log(`Socket connected: ${sock.id}`);

        const onRoomReady = (roomId) => {
            console.log("Room ready");
            if(roomId !== getCurrentRoomId()) return;
        }

        const onRoomStateUpdated = (state) => {console.log("Board updated")}

        const cycleFound = () => {console.log("Cycle found")};



        // ============= Server → Client events =============
        
        sock.on("connect", () => {
          console.log("[socket] connected", sock.id);
        });
        
        sock.on("roomReady", ({ roomId }) => {
          if (roomId !== currentRoomId) return;
          isRoomReady = true;
          board = drawBoard({onCellClick:sendMove});
          board.setReady(true);
          hideWaitOverlay();
          console.log("[socket] roomReady:", roomId);
        });
        
        sock.on("roomStateUpdated", (state) => {
          // state: { board, turn, moves, symbolIndex (beware Map->{}), winner }
          // Render your board from authoritative state:
          if(board) board.updateBoard(state.board);
        
          // Optional: if winner exists, show end-of-game UI
          if (state.winner) {
            // e.g., show modal "Winner: X"
            board.showWin(state.winningLine);
            board.setReady(false);
          }
        });
        
        sock.on("cycleFound", ({ cyclePath, state }) => {
          // Show UI that lets the NON-cycling player choose how to collapse.
          // Your UI should call `onCollapseChoice` with a callback -> sendCollapse
        
        
        board.setOnCellClick(sendCollapse);
        
        });
        
        return {
            
        }
};