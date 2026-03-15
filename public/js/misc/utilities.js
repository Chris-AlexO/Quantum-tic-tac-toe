export function convertSeconds(seconds){

 const mm = Math.floor(seconds / 60);
 const ss = seconds % 60;

 return mm.toString() + ":" + ss.toString().padStart(2,"0");
}