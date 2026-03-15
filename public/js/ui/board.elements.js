//Build the board SVG element. The basic structure is created here, but not the game state (marks etc)
const svgNS = "http://www.w3.org/2000/svg";

export default function buildBoard(cellSize, clickables)
{

    const svg = buildSvg(cellSize);

    for (let row = 0; row < 3; row++) 
    {
        for (let col = 0; col < 3; col++) 
        {
            const idx = row * 3 + col;
            // group per cell
            const g = buildCellGroup(cellSize, idx, row, col);

            // background rect of group
            const rect = backgroundRect(cellSize);
            g.appendChild(rect);


            //draw smaller squares
            for(let sRow = 0; sRow<3; sRow++)
            {
                for (let sCol=0;sCol<3;sCol++)
                {
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

            clickables.push({type: "BOARD_CELL_CLICK", element: g, cellIndex: idx});

            svg.appendChild(g);
        }
    };
        return svg
        
}

function buildSvg(cellSize) {
  const svg = document.createElementNS(svgNS, "svg");
  const size = cellSize * 3;
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.classList.add("board-svg");
  return svg;
}

function backgroundRect(cellSize)
{
    const rect = document.createElementNS(svgNS, "rect");
    rect.classList.add('board-background-rect');
    rect.setAttribute("x", 0);
    rect.setAttribute("y", 0);
    rect.setAttribute("width", cellSize);
    rect.setAttribute("height", cellSize);
    rect.setAttribute("rx", cellSize * 0.1);
    rect.setAttribute("ry", cellSize * 0.1);
    rect.setAttribute("stroke-width", cellSize * 0.02);
    return rect;
}

function buildCellGroup(cellSize, idx, row, col)
{
    const g = document.createElementNS(svgNS, "g");
    g.classList.add("board-cell");
    g.dataset.idx = String(idx);
    //g.setAttribute("data-idx", idx);
    g.setAttribute("transform", `translate(${col * cellSize}, ${row * cellSize})`);
    g.setAttribute("tabindex", "0"); // focusable for a11y
    g.setAttribute("width", cellSize);
    g.setAttribute("height", cellSize);
    return g;
}

function buildQLayerGroup()
{
    const qLayer = document.createElementNS(svgNS, "g");
    qLayer.setAttribute("class", "q-layer-group");
    return qLayer;
}


function buildLittleBackgroundRect(cellSize, idx, sIdx, sRow, sCol)
{
    const littleRect = document.createElementNS(svgNS, "rect");
    littleRect.setAttribute("class", "board-little-cell-rect");
    littleRect.setAttribute("data-idx", idx);
    littleRect.setAttribute("data-sidx", sIdx);
    littleRect.setAttribute("width", cellSize/3);
    littleRect.setAttribute("height", cellSize/3);
    littleRect.setAttribute("rx", cellSize * 0.025);
    littleRect.setAttribute("ry", cellSize * 0.025);
    littleRect.setAttribute("transform",  `translate(${sCol*cellSize/3}, ${sRow*cellSize/3})`);
    littleRect.setAttribute("stroke-width", cellSize * 0.01);
    return littleRect;
}

function buildClassicText(cellSize)
{
    const big = document.createElementNS(svgNS, "text");
    big.setAttribute("class", "classic-text");
    big.setAttribute("x", cellSize/2);
    big.setAttribute("y", cellSize/2); // optical adjust
    big.setAttribute("text-anchor", "middle");
    big.setAttribute("font-size", cellSize/5);
    big.setAttribute("font-family", "sans-serif");
    return big;
};

function buildClassicMarks(cellSize){

    const x = document.createElementNS(svgNS, "path");
    x.setAttribute(
    "d",
    `M ${cellSize*0.1} ${cellSize*0.1} L ${cellSize*0.9} ${cellSize*0.9} M ${cellSize*0.1} ${cellSize*0.9} L ${cellSize*0.9} ${cellSize*0.1}`);
        const w = cellSize * 0.08;
    x.setAttribute("stroke-width", w);

    x.setAttribute("fill", "none");
    x.setAttribute("stroke", "currentColor");   // or a fixed colour like "#fff"
    x.setAttribute("stroke-width", w);
    x.setAttribute("stroke-linecap", "round");
    x.setAttribute("vector-effect", "non-scaling-stroke"); // keeps stroke constant if scaled

  return x;


}
