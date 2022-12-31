import { collapseButtonUnclicked } from "./drawGame.js"
import { turnCollapseButtonOff, p, game} from "./gameLogic.js"

let canvas = document.querySelector('canvas')
let c = canvas.getContext('2d')

let i, j;

export let moves = [];
export let lst = [], lstLength;
export let playerMove = 1;
export let round;
let twinPosition, twinSquare;
let symbol, oppositeSymbol;
let height, width;
let text;
export let clickedAgain;

export let mouse = {
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


const boxHeight = 500
const boxWidth = 500

const x = (canvas.width - boxWidth) / 2 
const y = (canvas.height - boxHeight) / 2


export function InnerSquares(x, y, position){
    this.x = x;
    this.y = y;
    this.position = position;
    this.symbolCount = 0;
    this.list = [];
    this.assigned = false;
    this.dummyAssigned = false;
    this.aboutToCollapse = false;
    this.option; //It has collapsed and it is up to the player to decide which symbol goes into this square
    this.shutdown = false;

    let gradient = c.createLinearGradient(this.x, this.y, this.x+boxWidth/3, this.y+boxHeight/3);
    gradient.addColorStop(0, "grey");
    gradient.addColorStop(0.9 ,"silver");
    gradient.addColorStop(1, "white");
    

    this.squareColour = "#E0DD1C";
    this.optionColour = "purple";
    this.rC = 2.5// rC = reduction constant
    this.finalSymbol;

    this.removeShadows = () => {
        c.shadowColor = "transparent";
    }

    this.drawBigSquares = () => {
        c.beginPath();
        c.fillStyle = this.squareColour;
        c.fillRect(x+this.rC, y+this.rC, boxWidth/3 -this.rC*2, boxHeight/3 -this.rC*2);
        c.stroke();
    }
    

    this.draw = () =>{
        i=0;
        c.lineWidth = 1;
        c.strokeStyle = "black";
        while(i<3){
            j=0;
            while(j<3) {
                c.beginPath()
                c.rect(x + i*boxWidth/9, y + j*boxHeight/9, boxWidth/9, boxHeight/9)
                c.stroke()
                j++
            }  
            i++
        }
        i=0
        let shiftX;
        let shiftY = boxHeight/18 + 10//- c.measureText("X").height /2;
        while(i < this.symbolCount){
            text = this.list[i][0]
            if(this.aboutToCollapse && p.includes(text)){
                c.fillStyle = "blue";
                c.shadowColor = "green";
                c.shadowBlur = 15;
            }else {c.fillStyle = "black"}
            c.font = ("30px arial")
            width = c.measureText(text).width
            shiftX = boxWidth/18 - width / 2
            if(i < 3){
                c.fillText(text, x + i*boxWidth/9 + shiftX, y + shiftY)
            }
            else if(i < 6){
                c.fillText(text, x + (i-3)*boxWidth/9 + shiftX, y + boxHeight/9 + shiftY)
            }else if(i < 9){
                c.fillText(text, x + (i-6)*boxWidth/9 + shiftX, y + 2*boxHeight/9 + shiftY)
            }
            i++;
        }
    }

    this.optionHover = () => {
        c.clearRect(x+this.rC, y+this.rC, boxWidth/3-this.rC*2, boxHeight/3-this.rC*2)
        c.fillStyle = this.optionColour;
        c.fillRect(x+this.rC, y+this.rC, boxWidth/3-this.rC*2, boxHeight/3-this.rC*2);
        c.stroke();
    }

    this.assign = (symbol) => {
        if(this.assigned === false){
            console.log("assign called!")
        c.beginPath();
        c.clearRect(x+this.rC, y+this.rC, boxWidth/3-this.rC*2, boxHeight/3-this.rC*2)
        c.fillStyle = "silver";
        c.fillRect(x+this.rC, y+this.rC, boxWidth/3-this.rC*2, boxHeight/3-this.rC*2);
        c.font = "70px arial";
        c.fillStyle = "black";
        width = c.measureText(symbol).width
        c.fillText(symbol, this.x + boxWidth/6 - width/2, this.y + boxHeight/6 );
        c.closePath();
        }
    }

    this.addSymbol = (symbol) =>{
        this.list.push(symbol);
        this.symbolCount++;
    }

    this.chooseState = () => {
        this.option = true;
    }

    this.collapseAfterChoice = (symbol) => {
        twinPosition = symbol[1];
        twinSquare = game.innerSquaresArray[twinPosition-1];
        if(twinSquare.assigned === true){
            return
        }
        for(const symb of twinSquare.list){
            if(symb[0] === symbol[0]){
                continue;
            }else{
                twinSquare.assign(symb[0]);
                twinSquare.assigned = true;
                twinSquare.setFinalSymbol(symb[0]);
                this.collapseAfterChoice(symb)
                break;
            }
        }
    }

    this.turnOn = () => {
        this.shutdown = false;
    }


    this.setFinalSymbol = (s) => {
        this.finalSymbol = s;
    } 

    this.drawFinalSymbol = () => {
        c.beginPath()
        c.clearRect(x+this.rC, y+this.rC, boxWidth/3-this.rC*2, boxHeight/3-this.rC*2)
        c.fillStyle = gradient;
        c.fillRect(x+this.rC, y+this.rC, boxWidth/3-this.rC*2, boxHeight/3-this.rC*2);
        c.font = "70px arial";
        c.fillStyle = "black";
        width = c.measureText(this.finalSymbol).width
        c.fillText(this.finalSymbol, this.x + boxWidth/6 - width/2, this.y + boxHeight/6 + width/4);
        c.closePath()
    }

    this.update = () => {
        if(this.assigned === true){
            this.drawFinalSymbol();
            return;
        }

        if(this.dummyAssigned === true){
            this.assign(this.finalSymbol);
            return;
        }


        if(this.shutdown === true){
            this.drawBigSquares();
            this.draw();
            return;
        }
        
        if(!this.option){
            if(mouse.x > x && mouse.x < x+boxWidth/3 && mouse.y > y && mouse.y < y+boxHeight/3){
                this.squareColour = "#6064E9";
                c.fillStyle = this.squareColour;
            }else{
                this.squareColour = "#9CA4A4"
            }
            this.drawBigSquares()
            this.draw();
    
            if(mouseClick.x > this.x && mouseClick.x < this.x+boxWidth/3 && mouseClick.y > this.y && mouseClick.y < this.y+boxHeight/3){
                mouseClick.x = undefined;
                mouseClick.y = undefined;
                //Player can't place both his symbols in the same square.
                if(!Number.isInteger(playerMove)){
                    if(this.position === moves[moves.length - 1]){
                        clickedAgain = true;
                        return;
                    }
                }
                clickedAgain = false;

                round = Math.floor(playerMove);
                if(round%2 != 0){
                    if(!Number.isInteger(playerMove)){
                        twinPosition = moves[moves.length - 1]
                        symbol = ["X" + round.toString(), twinPosition] //symbol gives the actual symbol, round and the square of its 'twin'
                        game.innerSquaresArray[twinPosition-1].list[game.innerSquaresArray[twinPosition-1].list.length - 1][1] = this.position;//This (hopefully) assigns this symbol's position to it's older twin
                        
                    }else{
                    symbol = ["X" + round.toString(),"Nah"];}
                } else if(round%2 === 0){
                    if(!Number.isInteger(playerMove)){
                        twinPosition = moves[moves.length - 1]
                        symbol = ["O" + round.toString(), moves[moves.length - 1]]
                        game.innerSquaresArray[twinPosition-1].list[game.innerSquaresArray[twinPosition-1].list.length - 1][1] = this.position;
                    }else{
                    symbol = ["O" + round.toString(),"Nah"];}
                }
                this.addSymbol(symbol)
                moves.push(this.position);
                lst = moves.map((element, index) => {return [index, element]});
                lstLength = lst.length;
                playerMove += 0.5;
                game.collapse();
                
            }


            
        }else{
            this.optionHover();
            game.shutdownSquares();
            oppositeSymbol = symbol[0].charAt(0) === "X" ? "O" : "X";
            if(mouse.x > x && mouse.x < x+boxWidth/3 && mouse.y > y && mouse.y < y+boxHeight/3){
                this.optionColour = "blue";
                c.font = "70px arial";
                width = c.measureText(oppositeSymbol[0].charAt(0)).width
                c.fillStyle = "black"
                c.fillText(oppositeSymbol[0].charAt(0), this.x + boxWidth/6 - width/2, this.y + boxHeight/6 + width/2)
                
            }else{
                this.optionColour = "#15A2BB";
            }
            
            if(mouseClick.x > this.x && mouseClick.x < this.x+boxWidth/3 && mouseClick.y > this.y && mouseClick.y < this.y+boxHeight/3){
                mouseClick.x = undefined;
                mouseClick.y = undefined;
                collapseButtonUnclicked();
                turnCollapseButtonOff();
                for(const s of this.list){
                    if(s[0].charAt(0) === oppositeSymbol){
                        oppositeSymbol = s;
                    }
                }

                this.assign(oppositeSymbol[0]); //it should be "O" for the classic 188919
                this.assigned = true;
                this.setFinalSymbol(oppositeSymbol[0]);
                this.collapseAfterChoice(oppositeSymbol);
                game.turnOnSquares();
            }
        }
        
    }
}
