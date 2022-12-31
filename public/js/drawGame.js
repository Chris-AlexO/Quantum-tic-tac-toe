import { clickableCollapseButton, game, winningMark, isThereWinner } from "./gameLogic.js";
import { clickedAgain, playerMove } from "./placeOnBoard.js";

export const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

export let collapseButtonClicked = false;

export function collapseButtonUnclicked(){
    collapseButtonClicked = false;
    console.log(collapseButtonClicked);
}

let mouse = {
    x : undefined,
    y: undefined
}

let mouseClick = {
    x : undefined,
    y: undefined
}

window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
})

window.addEventListener('click', (event) => {
    mouseClick.x = event.x;
    mouseClick.y = event.y;

})

let i, j, text, extraText="", extraExtraText="", textWidth;
let textX = 1000;
let textY = 200;
let square1, square2;

export let boxHeight = 500
export let boxWidth = 500

export let x = (canvas.width - boxWidth) / 2 
export let y = (canvas.height - boxHeight) / 2

export function clearPage(){
    c.clearRect(0,0, canvas.width,canvas.height);
}

export function drawHeader(){
    c.beginPath()
    text = "Quantum Tic-Tac-Toe"
    c.fillStyle = "white";
    c.font = ("40px Arial")
    width = c.measureText(text).width
    c.fillText(text, (canvas.width)/2 - width/2, 65)
    c.closePath()
}

export function Text() {
    drawHeader();

    if(clickableCollapseButton){
        extraText = "There is a cyclical entanglement!"
        extraExtraText = "Collapse the wavefunction and pick a square!"
    }else{
        extraText="";
        extraExtraText=""
    }

    c.beginPath()
    c.font = "20px arial";
    c.fillStyle = "white"
    if(isThereWinner===false){
        if(Math.floor(playerMove)%2 != 0){
            text = "It's player 1's (X) turn!"
        }else{
            text = "It's player 2's (O) turn!"
        }
    }else{
        text = `Player ${winningMark} wins!`;
    }
    
    c.fillText(text, textX, textY);
    c.fillText(extraText, textX, textY +20);
    c.fillText(extraExtraText, textX, textY+40);
    if(clickedAgain){
        text = "You can't click the same square twice mate!";
        c.fillText(text, textX, textY+25);
    }
}

//creates inner squares
i = 0

let shift, width;
export function Atom(xs, ys, dx, dy, orbitR, colour, r = 5, twoOrbits = true, edge = false) {
    this.x = xs;
    this.y = ys;
    this.r = r;
    this.c = colour;
    this.orbitR = orbitR;
    this.edge = edge;
    this.orbitStart;
    this.orbitEnd;

    let random = Math.random()
    
    this.orbitAngle = this.edge ? -Math.PI/2.2 : 2*Math.PI*random;
    this.orbitAngle2 = this.orbitAngle - Math.PI/2;

    let cosRot;
    let sinRot;

    let t = random * Math.PI*2;

    this.dx=dx;
    this.dy=dy;
    this.dt = (1/100)*Math.PI;

    this.drawNuclueus = () => {
        c.beginPath();
        c.arc(this.x, this.y, this.r, 0, 2*Math.PI);
        c.fillStyle = this.c;
        c.strokeStyle = "white"
        //c.strokeStyle= this.c;
        if(this.edge === true){
            c.lineWidth = 10;
            c.stroke()
        }
        c.fill(); 
        c.closePath()
    }

    this.drawOrbit = (orbitAngle = this.orbitAngle) => {
        c.beginPath();
        if(this.edge){
            this.orbitStart = 0.45;
            this.orbitEnd = Math.PI*2/1.08
            c.ellipse(this.x, this.y, this.orbitR/2, this.orbitR, orbitAngle, this.orbitStart, this.orbitEnd)
            c.lineWidth = 5
            c.strokeStyle = "silver";
        }else{
            c.ellipse(this.x, this.y, this.orbitR/2, this.orbitR, orbitAngle, 0, Math.PI*2)
            c.lineWidth = 1;
            c.strokeStyle = "grey";
        }
        c.stroke()
        c.closePath()
    }

    this.drawElectron = (orbAngle) => {
        c.beginPath();
        c.fillStyle = "#111C6D";
        cosRot = Math.cos(orbAngle);
        sinRot = Math.sin(-orbAngle)
        let electronSize = this.edge ? 15 : 2
        c.arc(this.x + cosRot*this.orbitR*Math.cos(t)/2 + sinRot*this.orbitR*Math.sin(t), -sinRot*this.orbitR*Math.cos(t)/2 + cosRot*this.orbitR*Math.sin(t) + this.y, electronSize, 0, Math.PI*2)
        c.fill()
        c.closePath()
    }

    this.update = () => {
        let cut = 35
        let right = this.x + this.orbitR/2 + this.orbitR*Math.cos(this.orbitAngle)/2
        let left = this.x - (this.orbitR/2 + this.orbitR*Math.cos(this.orbitAngle)/2)
        let top = this.y - (this.orbitR/2 + this.orbitR*Math.sin(this.orbitAngle)/2)
        let bottom = this.y + this.orbitR/2 + this.orbitR*Math.sin(this.orbitAngle)/2

        
        if(right >= canvas.width || left <= 0 ){
            this.dx = -this.dx;
        }
        if( bottom >= canvas.height || top <= 0){
            this.dy = - this.dy;
        }
    
            if(top <= y + boxHeight + 1 && bottom >= y-1){
                if(right >= x && left <= x + boxWidth){
                    this.dy = -this.dy;
                }     
            } 
            if(left <= x + boxWidth + 2 && right >= x-2){
                if( bottom >= y && top <= y + boxHeight){
                    this.dx = -this.dx;
                }     
            }
    
        if(t >= Math.PI*2){
            t = 0;
        }else{
            t += this.dt;
        }
        
        this.x += this.dx;
        this.y += this.dy;

        this.drawNuclueus();
        this.drawOrbit();
        this.drawElectron(this.orbitAngle);
        if(twoOrbits===true){
            this.drawOrbit(this.orbitAngle2);
            this.drawElectron(this.orbitAngle2);
        }
        
    }
}

export function createCollapseRect() {
    shift = 50
    width = 200;

    let pseudoX = x+boxWidth+10;
    let pseudoY = y+boxHeight-55;

    if(clickableCollapseButton) {
        //turnCollapseButtonOff();
        c.beginPath();
        c.lineWidth = 5;
        c.fillStyle = "yellow"
        c.strokeStyle = "white"
        c.rect(pseudoX, pseudoY, width, shift);//mabes change variable name
        c.fill()
        c.stroke();
        c.closePath();

        if(mouse.x > pseudoX && mouse.x < pseudoX+width && mouse.y > pseudoY && mouse.y < pseudoY+shift){
            c.beginPath();
            c.fillStyle = "blue";
            c.fillRect(pseudoX, pseudoY, width, shift);
            c.closePath();
        }
    
        if(mouseClick.x > pseudoX && mouseClick.x < pseudoX+width && mouseClick.y > pseudoY && mouseClick.y < pseudoY+shift){
            mouseClick.x = undefined;
            mouseClick.y = undefined;
            console.log("collapse rect clicked!");
            collapseButtonClicked = true;
            game.collapse2();
            game.innerSquaresArray[0].removeShadows();
        }

    }else{
        c.beginPath();
        c.lineWidth = 5;
        c.fillStyle = "grey"
        c.strokeStyle = "white"
        c.rect(pseudoX, pseudoY, width, shift);//mabes change variable name
        c.fill()
        c.stroke();
        c.closePath();
    }
    

    c.beginPath()
    c.font = ("20px arial")
    c.fillStyle = "white"
    c.fillText("Collapse", x+boxWidth+10+(width - c.measureText("Collapse").width)/2, y+boxHeight-20)
    c.closePath();
}

export function drawWinningLine(positionOfFirstSquare, posiitonOfSecondSquare) {
    c.beginPath()
    square1 = game.innerSquaresArray[positionOfFirstSquare - 1]
    square2 = game.innerSquaresArray[posiitonOfSecondSquare - 1]
    c.strokeStyle = "red";
    c.lineWidth = 5;
    if(posiitonOfSecondSquare - positionOfFirstSquare === 2){
        c.moveTo(square1.x, square1.y+boxHeight/6)
        c.lineTo(square2.x + boxWidth/3, square2.y+boxHeight/6)
    }else if(posiitonOfSecondSquare - positionOfFirstSquare === 6){
        c.moveTo(square1.x + boxWidth/6, square1.y)
        c.lineTo(square2.x + boxWidth/6, square2.y + boxHeight/3)
    }else if(posiitonOfSecondSquare - positionOfFirstSquare === 8){
        c.moveTo(square1.x, square1.y);
        c.lineTo(square2.x + boxWidth/3, square2.y + boxHeight/3);
    }else if(posiitonOfSecondSquare - positionOfFirstSquare === 4){
        c.moveTo(square1.x + boxWidth/3, square1.y);
        c.lineTo(square2.x, square2.y + boxHeight/3);
    }
    c.stroke()
    c.closePath()
}

let radius = 150

let x1 = (canvas.width)/2
let y1 = (canvas.height-radius*2)/2

export function drawNaughtsAndCrosses(){
    const spacing=30;
    i=0;
    c.font = ("10px arial")
    c.fillStyle = "white";
    while(i < 6){
        j=0;
        while(j < 6){
            j%2 === 0 ? c.fillText("X", x1 + spacing*j - radius/2, y1 + spacing*i - radius/2) : c.fillText("O", x1 + spacing*j - radius/2, y1 + spacing*i - radius/2)
            j++;
        }
    i++;
    }
}

export function drawRect(x, y, width, height, link=null){
    c.beginPath()
    c.rect(x, y, width, height);
    c.strokeStyle="white";
    c.stroke()
    c.closePath();

    if(mouse.x >= x && mouse.x < x + width && mouse.y > y && mouse.y < y + height){
        c.beginPath();
        c.fillStyle = "blue";
        c.fillRect(x, y, width, height);
        c.closePath();
    }else{
        return;
    }

    if(link===null){
        return;
    }

    if(mouseClick.x >= x && mouseClick.x < x + width && mouseClick.y > y && mouseClick.y < y + height){
        mouseClick.x = undefined;
        mouseClick.y = undefined;
        window.location = "/local";
        console.log("clicked");
    }else{
        return;
    }
}

export function writeText(text, x, y, font){
    c.beginPath()
    c.font = font;
    c.fillStyle = "white"
    textWidth = c.measureText(text).width
    c.fillText(text, x-textWidth/2, y)
    c.closePath();
}



