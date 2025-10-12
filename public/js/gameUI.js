import { sendCollapse } from "./emitters.js";
import { getMark, getTurn, getBoard, getOnCellClick, getRoomReady, getNextAction, getOnSymbolClick, getWinningLine } from "./store.js";
import buildBoard from "./board.elements.js";
import { on } from "./bus.js";

const svgNS = "http://www.w3.org/2000/svg";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/css/style.css";
document.head.appendChild(link);

 // 1. Create the <svg> element

 const cellSize=175;
 const boardTop = "20px";
 const boardLeft = "20px";


export function drawBoard(data={}){

const mount = data.mount || null;


const state = {
    onCellClick: null,
    onSymbolClick: null,
    ready: false,
}

const onCellClickProxy = (idx) => state.onCellClick?.(idx);


const svg = buildBoard(cellSize, onCellClickProxy);


function cellGroup(i) { return svg.querySelector(`g[data-idx="${i}"]`); }
function littleCellGroup(i) { return svg.querySelector(`g[data-idx="${i}"]`).querySelectorAll(`rect.board-little-cell-rect`); }


function addClassic(cellIndex, player) {
  const g = cellGroup(cellIndex);
  const big = g.querySelector(".classic-text");
  big.setAttribute("fill", player === "X" ? "blue" : "red");
  big.textContent = player;
}

function addQuantum(cellIndex,smallCellIndex, token) {
  const g = cellGroup(cellIndex);
  console.log(g);
  const qLayer = g.querySelector(".q-layer-group");
  //console.log(qLayer)
  const x = cellSize/6 + (smallCellIndex % 3) * cellSize/3
  const y = cellSize/6 + Math.floor((smallCellIndex / 3)) * cellSize/3;
  const t = document.createElementNS(svgNS, "text");
  t.classList.add('quantum-symbol');
  t.setAttribute("x", x);
  t.setAttribute("y", y);  
  t.setAttribute("font-size", "18");
  t.setAttribute("font-family", "system-ui, sans-serif");
  t.setAttribute("fill", token.startsWith("X") ? "#06c" : "#c00");
  t.textContent = token;
  qLayer.appendChild(t);
};

function updateBoard(){
    const board = getBoard();
    for(let i = 0; i<9; i++){
        if(!Array.isArray(board[i])) {
            const g = cellGroup(i);
            const qLayer = g.querySelector(".q-layer-group");
            const rect= g.querySelector("rect");
            rect.style.fill = 'rgba(191,191,191,1)';
            const littleRects = g.querySelectorAll(`rect.board-little-cell-rect`);
            littleRects.forEach(littleRect => {littleRect.remove();})
            const texts = qLayer.querySelectorAll('text');
            texts.forEach(t => {t.remove();})
            addClassic(i, board[i]); 
            continue;}
        for(let j = 0 ; j<9; j++){
            if(board[i][j]) {addQuantum(i,j,board[i][j]);}
        }
    }

};

function showWin(wins){
console.log(`drawing winning lines`);

for(const win of wins){
const line = document.createElementNS(svgNS, "polygon");
const points = win.map(p => {
const x = cellSize / 2 + (((p-1) % 3) * cellSize);
const y = cellSize / 2 + (Math.floor((p-1) / 3) * cellSize);
return x.toString()+","+y.toString();
}).join(" ")

line.setAttribute("points", points);
line.setAttribute("fill", "lightblue");
line.setAttribute("stroke", "red ");
line.setAttribute("stroke-width", "2");
svg.appendChild(line);


}}


function showCollapsePath(pth){


}

function showCollapseSquares(squares){
    if(!Array.isArray(squares)) return;
    for(let i =0;i<squares.length;i++){
    const sq = squares[i];
    const [square, symbol] = sq
    const g = cellGroup(square);
    const qLayer = g.querySelector(".q-layer-group");
    const littleRects = littleCellGroup(square);
    littleRects.forEach(littleRect => {littleRect.remove();})
    const texts = qLayer.querySelectorAll('.quantum-symbol');
    console.log(qLayer);
    console.log(texts);
    texts.forEach(t => {t.remove();})
    document.querySelectorAll('.quantum-symbol').forEach(t => t.remove());
    console.log(document.querySelectorAll('text'))

    const rect= g.querySelector(".board-background-rect");
    console.log(rect);
    //rect.setAttribute("fill", 'rgba(191, 191, 191, 1)');
    rect.style.fill = 'rgba(191,191,191,1)';
    rect.style.zIndex = 100000;
    //rect.setAttribute('z-index', '1000');


const x =  cellSize / 2;
const y = cellSize / 2;

    const lt = document.createElementNS(svgNS, "text");
    const rt = document.createElementNS(svgNS, "text");

    lt.classList.add('choosing-symbol')
    lt.setAttribute("x", x-cellSize/10);
    lt.setAttribute("y", y);
    lt.setAttribute("dominant-baseline", "middle"); 
    lt.setAttribute("text-anchor", "middle");
    lt.setAttribute("font-size", "18");
    lt.setAttribute("font-family", "system-ui, sans-serif");
    lt.setAttribute("fill", "rgba(138, 15, 239, 1)");
    lt.textContent = symbol;

    lt.style.cursor = "pointer";
    lt.setAttribute("role", "button");
    lt.setAttribute("tabindex", "0");
    lt.addEventListener("click", () => state.onSymbolClick(square, symbol));
    

    rt.classList.add('choosing-symbol')
    rt.setAttribute("x", x+cellSize/10);
    rt.setAttribute("y", y);
    rt.setAttribute("dominant-baseline", "middle"); 
    rt.setAttribute("text-anchor", "middle");
    rt.setAttribute("font-size", "18");
    rt.setAttribute("font-family", "system-ui, sans-serif");
    rt.setAttribute("fill", "rgba(138, 15, 239, 1)");
    const altSymbol = squares[(i + 1) % squares.length][1]
    rt.textContent = altSymbol;
    rt.setAttribute("role", "button");
    rt.setAttribute("tabindex", "0");
    rt.addEventListener("click", () => {state.
                                        onSymbolClick(square, altSymbol)});

    qLayer.appendChild(lt);
    qLayer.appendChild(rt);

    }

}

(mount || document.body).appendChild(svg);
//document.body.appendChild(svg);


return{
    svg,
    setOnSymbolClick(fn){state.onSymbolClick = fn || null},
    destroy() {svg.remove();},
    updateState(newState){
        //svg = buildBoard(cellSize);
        //console.log(svg);
        updateBoard();
        console.log(newState);

        if(newState.mark===newState.turn && newState.nextAction === 'move'){ 
            //console.log(newState.onCellClick.name)
            state.onCellClick = newState.onCellClick;
            state.onSymbolClick = (()=>{});

        }
        else if(newState.mark===newState.turn && newState.nextAction === 'collapse'){
            state.onSymbolClick = (newState.onSymbolClick);
            state.onCellClick = (()=>{});
            showCollapseSquares(newState.cyclePath);
    }else if(newState.nextAction === 'winner'){
        console.log('Board says win');
        state.onCellClick = (()=>{});
        state.onSymbolClick = (()=>{});
        showWin(newState.winningLine);
        /*ErrorView.addButton('50%', '50%', "Back to Multiplayer Menu", () => {
          const base = window.location.origin + "/multiplayer";
          console.log(window.location.origin);
          window.location.href = base;
        });*/
    }

        
        //state.ready = getRoomReady();
    },

    showWin,
    showCollapseSquares,
    //talk() {console.log(`onSquareClick: ${state.onSquareClick ? state.onSquareClick.name : 'None'}`)},

}

}





export function addButton(x,y,text,handler){
const btn = document.createElement("button");
  btn.textContent = "Click Me"; // default label (you can parameterize this)

  // Position it (absolute coords on the page)
  btn.style.position = "absolute";
  btn.style.left = `${x}px`;
  btn.style.top = `${y}px`;
  btn.style.height='50px';
  btn.style.width='250px';
  btn.textContent=text;

  // Attach the handler
  btn.addEventListener("click", handler);

  // Add it to the page
  document.body.appendChild(btn);

  return btn; // in case you want to reference/remove later
}



export function onCollapseChoice({ cyclePath, state, myMark, confirm }) {
  // Show a modal / overlay with the cycle details.
  // When the user picks (bigSquareIdx, tokenId), call confirm(bigSquareIdx, tokenId)
}

export function showWaitOverlay(text) {
  // show “waiting for opponent…”
  console.log('show overlay');
  const overlay = document.createElement("div");
  overlay.textContent = text;
  overlay.style.color="white";
  overlay.style.position = "absolute";
  overlay.style.left='50px';
  overlay.style.top = "50px";
  overlay.className="overlay";

  document.body.appendChild(overlay);


}
export function hideWaitOverlay() {
  // hide it
}
