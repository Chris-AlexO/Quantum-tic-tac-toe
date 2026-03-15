import {
  getRoomId,
  getPlayerName,
  setMark,
  handleServerStateUpdate,
} from "../game/state.js";
import { withAck } from "./withAck.js";



export function createEmitter() 
{

  return {

    // Ask server to create a room (you become host, and X)
    async createRoom(roomName) 
    {
      if(!roomName){ console.error("No room name provided"); return null; }
      return withAck("createRoom", {
        roomName,
        type: "mp",
        name: getPlayerName()
      });
    },

    async quickMatch() 
    {
      try
      {
      const ack = await withAck("joinReadyRoom", { requestedRoomType: "mp" });
      if (ack?.mark) {
        setMark(ack.mark);
      }
      if (ack?.state) {
        handleServerStateUpdate(ack.state, ack.mark, ack.role ?? (ack.mark ? "player" : "spectator"));
      }
      return ack;
      }
      catch(err){
      console.error("Join failed:", err);
      return null;
      }
    },

    async sendMove(bigSquare) 
    {
      return withAck("move", { bigSquare });
    },

    async sendCollapse(chosenBigSquare, chosenMark) 
    {
      return withAck("collapse", {
        square: chosenBigSquare,
        playerSymbol: chosenMark,
      });
    },

    async sendPlayerName(name)
    {

      let ack;
      try{
           ack = await withAck("name", { name: name })
        }
        catch (e)
        {
          console.warn("Couldn't save this name", e);
        }
        return ack;

    },

    async joinRoomById(roomId) {
      try {
        const ack = await withAck("joinSpecificRoom", { roomId });
        if (ack?.mark) {
          setMark(ack.mark);
        }
        return ack?.roomId ? ack : null;
      } catch (err) {
        console.warn("Join failed:", err);
        return null;
      }
    },

    async requestRematch() {
      const currentRoomId = getRoomId();
      if (!currentRoomId) return null;

      try {
        return await withAck("rematchRequest", { roomId: currentRoomId });
      } catch (err) {
        console.warn("Rematch failed:", err);
        return null;
      }
    },

    async respondToRematch(accept) {
      const currentRoomId = getRoomId();
      if (!currentRoomId) return null;

      try {
        return await withAck("rematchRespond", {
          roomId: currentRoomId,
          accept: Boolean(accept)
        });
      } catch (err) {
        console.warn("Rematch failed:", err);
        return null;
      }
    },

    async requestDraw() {
      const currentRoomId = getRoomId();
      if (!currentRoomId) return null;

      try {
        return await withAck("drawRequest", { roomId: currentRoomId });
      } catch (err) {
        console.warn("Draw request failed:", err);
        return null;
      }
    },

    async respondToDraw(accept) {
      const currentRoomId = getRoomId();
      if (!currentRoomId) return null;

      try {
        return await withAck("drawRespond", {
          roomId: currentRoomId,
          accept: Boolean(accept)
        });
      } catch (err) {
        console.warn("Draw response failed:", err);
        return null;
      }
    }

  };

  

}


/*=================================================================================================================*/


// Join a room by code. Just check if it exists brody
export function sendDetailsToOpponent(){
     const details = {name: getPlayerName()}

     return details
}
