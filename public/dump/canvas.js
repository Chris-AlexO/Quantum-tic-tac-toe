import { game } from "./gameLogic.js";
import { Atom, clearPage, createCollapseRect, drawWinningLine, Text, canvas, x, y} from "./drawGame.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/css/style.css";
document.head.appendChild(link);

let j, i;
let shift;
export let ans, p;
export let winningSquares, winningMark;

let boxHeight = 500
let boxWidth = 500

window.addEventListener('resize', () => {
    canvas.width = (window.innerWidth);
    canvas.height = (window.innerHeight); // doesn't currently work
})

game.createArrayOfEachSquare()

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

    clearPage()

    for(const atom of atomArray){
        atom.update();
    }

   Text();

   createCollapseRect();
    
    for(const innerSquares of game.innerSquaresArray){
        innerSquares.update();
        }

    game.checkIsThereIsOneSquareLeft();
    
    winningSquares = game.isWinner()
    if(winningSquares){
        winningMark = winningSquares[0];
        drawWinningLine(winningSquares[1][0], winningSquares[1][2]);
    }
    
    
}

animate();