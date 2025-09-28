import { sendCollapse } from "./emitters.js";

const svgNS = "http://www.w3.org/2000/svg";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/css/style.css";
document.head.appendChild(link);

 // 1. Create the <svg> element

 const cellSize=175;
 const boardTop = "20px";
 const boardLeft = "20px";


export function drawBoard({mount, onSquareClick, onSymbolClick}={}){
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("width", cellSize *3);
svg.setAttribute("height", cellSize * 3);
svg.setAttribute("viewBox", "0 0 600 600");
Object.assign(svg.style, {
    border: "1px solid transparent",
    position: "fixed",            // or "absolute" if mount is position:relative
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "10",
    backgroundColor: "transparent",
  });

  console.log(`onSquareClick: ${onSquareClick ? onSquareClick.name : 'None'}`);



  // click handler (you can swap to smallSquare later)
          const state = {
            ready: false,
            onSquareClick: onSquareClick || null,
            onSymbolClick: onSymbolClick || sendCollapse,
            classical: false,
            myTurn: false,
            token: 'X1',
          }



function cellGroup(i) { return svg.querySelector(`g[data-idx="${i}"]`); }
function littleCellGroup(i) { return svg.querySelector(`g[data-idx="${i}"]`).querySelectorAll(`rect.littleSquare`); }


for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const idx = row * 3 + col; // 0..8


          // group per cell
        const g = document.createElementNS(svgNS, "g");
        g.dataset.idx = String(idx);
        g.setAttribute("data-idx", idx);
        g.setAttribute("transform", `translate(${col * cellSize}, ${row * cellSize})`);
        g.setAttribute("tabindex", "0"); // focusable for a11y


         // background rect
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("class", "backRect");
        rect.setAttribute("x", 0);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", cellSize);
        rect.setAttribute("height", cellSize);
        rect.setAttribute("fill", "transparent");
        rect.setAttribute("stroke", "black");
        rect.setAttribute("stroke-width", 2);
        g.appendChild(rect);


            //draw smaller squares
        for(let sRow = 0; sRow<3; sRow++){
            for(let sCol=0;sCol<3;sCol++){
                const sIdx = sRow * 3 + sCol
                const littleRect = document.createElementNS(svgNS, "rect");
                littleRect.setAttribute("class", "littleSquare");
                littleRect.setAttribute("data-idx", idx);
                littleRect.setAttribute("data-sidx", sIdx);
                littleRect.setAttribute("width", cellSize/3);
                littleRect.setAttribute("height", cellSize/3);
                littleRect.setAttribute("transform",  `translate(${sCol*cellSize/3}, ${sRow*cellSize/3})`);
                littleRect.setAttribute("fill", "transparent");
                littleRect.setAttribute("stroke", "black");
                g.appendChild(littleRect);

            }
        }

        const qLayer = document.createElementNS(svgNS, "g");
        qLayer.setAttribute("class", "q-layer");
        g.appendChild(qLayer);

        const big = document.createElementNS(svgNS, "text");
        big.setAttribute("class", "classic");
        big.setAttribute("x", cellSize/2);
        big.setAttribute("y", cellSize/2); // optical adjust
        big.setAttribute("text-anchor", "middle");
        big.setAttribute("font-size", cellSize/5);
        big.setAttribute("font-family", "sans-serif");
        big.textContent = "";
        g.appendChild(big);



       
        g.addEventListener("click", (e) => {         
        //don't add event listeners if to board if room not ready
        console.log(state.ready);
            if(!state.ready) return;
            const g = e.target.closest('g[data-idx]');
        if (!g || !svg.contains(g)) return;
        const idx = Number(g.dataset.idx);
        //console.log('clickOnCellEvent', idx); 


            //state.classical ? addClassic(idx) : addQuantum(idx); 
            //console.log(state.onSquareClick.name);
            state.onSquareClick?.(idx);}); // demo
        

        svg.appendChild(g);
        }
    
    };
        
      


function addClassic(cellIndex, player) {
  const g = cellGroup(cellIndex);
  const big = g.querySelector(".classic");
  big.setAttribute("fill", player === "X" ? "blue" : "red");
  big.setAttribute("dominant-baseline", "middle"); 
  big.textContent = player;
}

function addQuantum(cellIndex,smallCellIndex,token) {
  const g = cellGroup(cellIndex);
  const qLayer = g.querySelector(".q-layer");
  const existing = qLayer.querySelectorAll("text").length;


  const x = cellSize/6 + (smallCellIndex % 3) * cellSize/3

  const y = cellSize/6 + Math.floor((smallCellIndex / 3)) * cellSize/3;

  const t = document.createElementNS(svgNS, "text");
  t.setAttribute("x", x);
  t.setAttribute("y", y);
  t.setAttribute("dominant-baseline", "middle"); // vertical centering
t.setAttribute("text-anchor", "middle");        
  t.setAttribute("font-size", "18");
  t.setAttribute("font-family", "system-ui, sans-serif");
  t.setAttribute("fill", token.startsWith("X") ? "#06c" : "#c00");
  t.textContent = token;
  qLayer.appendChild(t);
};

function updateState(board){
    for(let i = 0; i<9; i++){
        if(!Array.isArray(board[i])) {
            const g = cellGroup(i);
            const qLayer = g.querySelector(".q-layer");
            const rect= g.querySelector("rect");
            rect.setAttribute("fill", 'transparent');
            const littleRects = g.querySelectorAll(`rect.littleSquare`);
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

function showWin(win){
const line = document.createElementNS(svgNS, "polygon");

const points = win.map(p => {
const x = cellSize / 2 + (((p-1) % 3) * cellSize);
const y = cellSize / 2 + (Math.floor((p-1) / 3) * cellSize);
return x.toString()+","+y.toString();
}).join(" ");

line.setAttribute("points", points);
line.setAttribute("fill", "lightblue");
line.setAttribute("stroke", "red ");
line.setAttribute("stroke-width", "2");
 svg.appendChild(line);

}

function showCollapsePath(pth){


}

function showCollapseSquares(squares){

    for(let i =0;i<squares.length;i++){
    const sq = squares[i];
    const [square, symbol] = sq
    const g = cellGroup(square);
    const qLayer = g.querySelector(".q-layer");
    const littleRects = littleCellGroup(square);
    littleRects.forEach(littleRect => {littleRect.remove();})
    const texts = qLayer.querySelectorAll('text');
    texts.forEach(t => {t.remove();})
    const rect= g.querySelector("rect");
    rect.setAttribute("fill", 'rgba(191, 191, 191, 1)');


const x =  cellSize / 2;
const y = cellSize / 2;

    const lt = document.createElementNS(svgNS, "text");
    const rt = document.createElementNS(svgNS, "text");

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
    rt.addEventListener("click", () => state.onSymbolClick(square, altSymbol));

    qLayer.appendChild(lt);
    qLayer.appendChild(rt);

    }

}

(mount || document.body).appendChild(svg);


return{
    svg,
    setReady(ready){ state.ready = !!ready;},
    setOnCellClick(fn){state.onSquareClick = fn || null;},
    setOnSymbolClick(fn){state.onSymbolClick = fn || null},
    destroy() {svg.remove();},
    updateState,
    showWin,
    setToken(token) {state.token = token},
    showCollapseSquares,
    talk() {console.log(`onSquareClick: ${state.onSquareClick ? state.onSquareClick.name : 'None'}`)},

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
