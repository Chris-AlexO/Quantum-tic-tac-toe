
function validateBoard(board){

}

function validateMove(board, move){

}

function applyMove(board, move){
    let message = "";
    let valid = validateBoard(board, move, message);
    if(!valid)  return {message: message}


    //return new Board();
}