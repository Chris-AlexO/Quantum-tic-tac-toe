import { on } from "./bus.js";
import { setPlayerName } from "../game/state.js";

export function createEventHandlers(deps) {

    const offIdentity = on('net:identity', ({ playerId, playerName }) => {
        //console.log(`Received identity from server: ${playerId}`);
        localStorage.setItem("playerId", playerId);
        window.playerId = playerId;
        if (playerName) {
            setPlayerName(playerName);
        }
        //should really store it in state but don't wanna patch
    });

    const offConnect = on('net:connect', async () => {
         
    });

    
    return () => {
    offIdentity();
    offConnect();
    };
    

}
