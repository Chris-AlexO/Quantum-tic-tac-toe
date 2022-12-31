import {moves, InnerSquares, lst, lstLength, playerMove} from "./placeOnBoard.js"
import { collapseButtonClicked, boxWidth, boxHeight, x, y } from "./drawGame.js";

const winner = [[1,2,3], [4,5,6], [7,8,9], [3,6,9], [2,5,8], [1,4,7], [1,5,9], [3,5,7]];
let idx1, idx2, idx3, finalSymbol1, finalSymbol2, finalSymbol3;
export let clickableCollapseButton = false;
let position, innerSquares, markLetter, markNumber, mark;
let i, j, ans, count;
export let p;
export let isThereWinner = false;
export let winningMark;
let twinPosition;

export function turnCollapseButtonOff() {
     clickableCollapseButton  = false;
}

export function Game(){
    let symbol;
    let sq;
    this.pathAndSymbolArray;
    this.innerSquaresArray = [];

    this.createArrayOfEachSquare = () => {
        i=0;
    position = 1;
    while(i<3){
        j=0
        while(j<3){
            innerSquares = new InnerSquares(x + j*boxWidth/3, y + i*boxHeight/3, position);
            this.innerSquaresArray.push(innerSquares);
            j++
            position++
        }
        i++;
    }
}

this.collapse = () => {
    if(Number.isInteger(playerMove)){
        [ans, p] = this.canCollapse2(lst, lstLength-1, moves[lstLength-1], moves[lstLength-2]) // checks if there is a cyclical entanglement. returns the entangled squares and symbols.
        this.pathAndSymbolArray = [ans, p]
        console.log(ans);
        console.log(p);
        if(Array.isArray(ans)){
            this.setAboutToCollapse(ans);
            this.shutdownAllSquares()
    }
    }
}
this.collapse2 = () => {
    this.defaultCollapse(this.pathAndSymbolArray[0]); 
    this.turnOnSquares();
}

     this.canCollapse2 = (lst, idx_to_avoid, square_to_pree, target_square, path=[], idxPath=[], truePath=null, trueIdxPath=null) => {
        let index, square, idx, positionOfTwin, pth, idxPth, d;
        for(const entry of lst) {
            index = entry[0];
            square = entry[1];
            if(index === idx_to_avoid){
                continue;
            }
            if(square === square_to_pree){
                path.push(square_to_pree)
                idxPath.push(this.getSymbol(index))
                idx = index % 2 === 0 ? index + 1  : index - 1
                positionOfTwin= moves[idx]
                if(positionOfTwin === target_square) {
                    path.push(positionOfTwin)
                    idxPath.push(this.getSymbol(lst.length - 1))
                    return [path, idxPath]
                }
                d = this.canCollapse2(lst, idx, positionOfTwin, target_square, path, idxPath, truePath, trueIdxPath);
                pth = d[0];
                idxPth = d[1];
                if(d[0]===null){
                    path = []
                    idxPath = []
                }else{
                    path = []
                    idxPath = []
                    truePath = pth
                    trueIdxPath = idxPth;
                }
            }
        } 
        return [truePath, trueIdxPath] //return list consisting of path which causes collapse of wavefunction -> collapse path
     }

     this.collapseTwinsWhatever = (symbol) => {
         //For each mark that shares the same square as a mark that has already collapsed said square, their twin's square should also collapse by logic. if that makes sense :)
         //This function is particularly for the squares that contain the marks that have collapsed by default from being in a square in the cyclical path but not actually being part of that part so there by collapsing in it's non-path square.
        twinPosition = symbol[1]
        let twinSquare = this.innerSquaresArray[twinPosition - 1]
        twinSquare.assign(symbol[0]);
        twinSquare.assigned = true;
        twinSquare.setFinalSymbol(symbol[0]);
         for(const mark of twinSquare.list){
            if(mark[0] === symbol[0]){
                continue;
            }else{
                this.collapseTwinsWhatever(mark)
            }
         }
     }

    this.defaultCollapse = (path) => {
        //posStart grabs square at the beginning of the collapse path and posEnd, the square at the end.
        //If the mark/symbol is in one of the squares in the path but it's twin isn't, the twin square should collapse into that mark
        let square1, i, first, second;

        for(const square of path){
            square1 = this.innerSquaresArray[square - 1]
        i = 0;
        while(i < square1.list.length){
            symbol = square1.list[i]
            twinPosition = symbol[1];
            if(!path.includes(twinPosition)){
                this.collapseTwinsWhatever(symbol);
                square1.list.splice(i, 1);
                square1.symbolCount -= 1;
                i--;
            }
            i++;
        }
        }
        
        //-----------Loop through path and collapse the squares which only contain one symbol [O1, O2] would collpase into O.
        for(const square of path){
            sq = this.innerSquaresArray[square-1];
            first = sq.list[0];
            second = sq.list[1];
            if(first[0].charAt(0) === second[0].charAt(0)){
                if(first[1] === second[1]){
                    console.log("bruh");
                    twinPosition = first[1];
                    sq.assign(first[0]); //randomise this so that it could be either
                    this.innerSquaresArray[twinPosition - 1].assign(second[0]);
                    sq.assigned = true;
                    this.innerSquaresArray[twinPosition - 1].assigned = true;
                    sq.setFinalSymbol(first[0]);
                    this.innerSquaresArray[twinPosition - 1].setFinalSymbol(second[0]);

                }else{
                console.log(first[0].charAt(0));
                sq.option = true;
                //sq.assign(first[0].charAt(0)); 
                sq.finalSymbol = first[0].charAt(0)
                sq.dummyAssigned = true;
                }
                
            }else{
                sq.chooseState();
            }

        }
    }


    this.getSymbol = (idx) => {
        //gets symbol based on its index in a path
        return Math.floor((idx / 2) + 1) % 2 != 0 ? "X" + Math.floor((idx / 2) + 1).toString() : "O" + Math.floor((idx / 2) + 1).toString()
    }

    this.setAboutToCollapse = (path) => {
        for(const square of path){
            this.innerSquaresArray[square - 1].aboutToCollapse = true
        }
        clickableCollapseButton = true;
    }

    this.shutdownAllSquares = () => {
        for(let i=0; i < 9; i++){
            this.innerSquaresArray[i].shutdown = true; 
        }
    }

    this.shutdownSquares = () => {
        for(let i=0; i < 9; i++){
            if(!this.pathAndSymbolArray[0].includes(i+1)){
                this.innerSquaresArray[i].shutdown = true;
            }
        }
    }

    this.turnOnSquares = () => {
        for(let i=0; i < 9; i++){
            this.innerSquaresArray[i].turnOn(); 
        }
    }

    this.isWinner = () => {
        for(const win of winner){
            finalSymbol1 = this.innerSquaresArray[win[0] - 1].finalSymbol
            finalSymbol2 = this.innerSquaresArray[win[1] - 1].finalSymbol
            finalSymbol3 = this.innerSquaresArray[win[2] - 1].finalSymbol
            if(finalSymbol1 === undefined || finalSymbol2 === undefined || finalSymbol3 === undefined){
                continue;
            }
            idx1 = finalSymbol1.charAt(0);
            idx2 = finalSymbol2.charAt(0);
            idx3 = finalSymbol3.charAt(0);
            if(idx1 === idx2 && idx1 === idx3 && idx2 === idx3){
                console.log("Winner")
                this.shutdownAllSquares();
                isThereWinner = true;
                winningMark = idx1;
                return [idx1, win];
            }
        }
    }

    this.checkIsThereIsOneSquareLeft = () => {
        //self-explanatory. When only one square is left. the current player has to place both his symbols in that square. In this case, it shall collapse automatically
        //Will provide an explanation when I have time. So this functino is incomplete.
        count = 0;
        for(const square of this.innerSquaresArray){
            if(square.finalSymbol){
                count++;
            }
        }
        if(count===8){
            for(const square of this.innerSquaresArray){
                if(!square.finalSymbol){
                    markLetter = symbol[0].charAt(0) === "X" ? "O" : "X";
                    markNumber = (parseInt(symbol[0].charAt(1), 10) + 1).toString();
                    mark = markLetter + markNumber
                    square.assign(mark)
                    square.assigned = true;
                    square.setFinalSymbol(mark);
                    return;
                }
            }
        }

    }

}

export const game = new Game()