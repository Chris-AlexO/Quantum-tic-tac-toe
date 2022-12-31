import { Atom, clearPage, drawHeader, drawNaughtsAndCrosses, drawRect, writeText, canvas} from "./drawGame.js";

let x, y, width, height;


let mouse = {
    x : undefined,
    y: undefined
}

let mouseClick = {
    x : undefined,
    y: undefined
}

window.addEventListener('resize', () => {
    canvas.width = (window.innerWidth);
    canvas.height = (window.innerHeight);
})

window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;

})

window.addEventListener('click', (event) => {
    mouseClick.x = event.x;
    mouseClick.y = event.y;

})

let radius = 150

x = (canvas.width)/2
y = (canvas.height-radius*2)/2
const atom = new Atom(x, y, 0, 0, 250, "black", radius, false, true);

width = 300;
height = 85;



function animate(){
    requestAnimationFrame(animate);
    clearPage()
    console.log("bruh")
    x = (canvas.width)/2
    y = (canvas.height-radius*2)/2
    drawHeader();
    
    atom.update();
    drawNaughtsAndCrosses();

    drawRect(x - width/2, y + 200, width, height, "/local");
    writeText("Local Match", x , y + 250, "30px arial");

    drawRect(x - width/2, y + 300, width, height)
    writeText("Online Match", x, y + 350, "30px arial");
}

animate();




