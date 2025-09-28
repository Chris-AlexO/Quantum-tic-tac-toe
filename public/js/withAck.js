import { sock } from "./sock.js";

export function withAck(event, ...args){

    return new Promise((resolve, reject) => {
        sock.emit(event, ...args, (ack)=>{
            if(!ack || ack.status==='error' ){
                reject(ack || {status:'error', message:'no ack, akh'});
            }
            resolve(ack);
        });
    });
}