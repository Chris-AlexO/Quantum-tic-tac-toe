
import { on } from "./bus.js";
import { sendCollapse } from "./emitters.js";
import { getMark, getTurn, getBoard, getOnCellClick, getRoomReady, getNextAction, getOnSymbolClick, getWinningLine, getGameStatus } from "./store.js";

const svgNS = "http://www.w3.org/2000/svg";

export default function buildBoard(cellSize, onCellClick = null){

    
    
    
    const svg = buildSvg(cellSize);

    for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const idx = row * 3 + col; // 0..8
            // group per cell
            const g = buildCellGroup(cellSize, idx, row, col);
    
             // background rect of group
            const rect = backgroundRect(cellSize)
            g.appendChild(rect);
    
    
                //draw smaller squares
            for(let sRow = 0; sRow<3; sRow++){
                for(let sCol=0;sCol<3;sCol++){
                    const sIdx = sRow * 3 + sCol
                    const littleRect = buildLittleBackgroundRect(cellSize, idx, sIdx, sRow, sCol);
                    g.appendChild(littleRect);
    
                }
            }
    
            const qLayer = buildQLayerGroup();
            g.appendChild(qLayer);
    
            const big = buildClassicText(cellSize);
            big.textContent = "";
            g.appendChild(big);
    
    

           
            g.addEventListener("click", (e) => {         
            //don't add event listeners if to board if room not ready

                if(!getRoomReady()) return;
                const g = e.target.closest('g[data-idx]');
            if (!g || !svg.contains(g)) return;
            const idx = Number(g.dataset.idx);
            console.log('clickOnCellEvent', idx); 
    
    
                //state.classical ? addClassic(idx) : addQuantum(idx); 
                //console.log(state.onSquareClick.name);
                //state.onSquareClick?.(idx);}); // demo
                onCellClick?.(idx);
            });
        svg.appendChild(g);
        }};
        

        return svg

        
}




function buildSvg(cellSize){

const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("width", cellSize *3);
svg.setAttribute("height", cellSize * 3);
svg.setAttribute("viewBox", "0 0 600 600");
svg.classList.add("board-svg");
return svg;
}


function backgroundRect(cellSize){
    const rect = document.createElementNS(svgNS, "rect");
        rect.classList.add('board-background-rect');
        rect.setAttribute("x", 0);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", cellSize);
        rect.setAttribute("height", cellSize);
        return rect;
}

function buildCellGroup(cellSize, idx, row, col){
        const g = document.createElementNS(svgNS, "g");
        g.dataset.idx = String(idx);
        g.setAttribute("data-idx", idx);
        g.setAttribute("transform", `translate(${col * cellSize}, ${row * cellSize})`);
        g.setAttribute("tabindex", "0"); // focusable for a11y
        return g;
}

function buildQLayerGroup(){
    const qLayer = document.createElementNS(svgNS, "g");
    qLayer.setAttribute("class", "q-layer-group");
    return qLayer;
}


function buildLittleBackgroundRect(cellSize, idx, sIdx, sRow, sCol){
                const littleRect = document.createElementNS(svgNS, "rect");
                littleRect.setAttribute("class", "board-little-cell-rect");
                littleRect.setAttribute("data-idx", idx);
                littleRect.setAttribute("data-sidx", sIdx);
                littleRect.setAttribute("width", cellSize/3);
                littleRect.setAttribute("height", cellSize/3);
                littleRect.setAttribute("transform",  `translate(${sCol*cellSize/3}, ${sRow*cellSize/3})`);
                return littleRect;


}

function buildClassicText(cellSize){

const big = document.createElementNS(svgNS, "text");
            big.setAttribute("class", "classic-text");
            big.setAttribute("x", cellSize/2);
            big.setAttribute("y", cellSize/2); // optical adjust
            big.setAttribute("text-anchor", "middle");
            big.setAttribute("font-size", cellSize/5);
            big.setAttribute("font-family", "sans-serif");
            return big;
};