import { sock } from "./sock.js";

import { getRoomId} from "../game/state.js";

export function withAck(event, payload){
    console.log("emitting", event, payload);

    if(!payload.roomId)
    {
        payload = { ...payload, roomId: getRoomId() };
    }

    return new Promise((resolve, reject) => {
        sock.emit(event, payload, (ack)=>{
            if(!ack || ack.status==='error' ){
                reject(ack || {status:'error', message:'no ack, akh'});
            }
            resolve(ack);
        });
    });
}

export function tryWithAck(event, payload, message) {
        try{
            const ack = withAck(event, payload);
        } catch(e){
            console.warn( message, e)
        }

        return ack;
        
}