import { Atom, clearPage,  drawNaughtsAndCrosses,canvas} from "../drawGame.js";

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

const radius = 150

x = (canvas.width)/2
y = (canvas.height-radius*2)/2
const atom = new Atom(x, y, 0, 0, 250, "black", radius, false, true);




function animate(){
    requestAnimationFrame(animate);
    clearPage()

    x = (canvas.width)/2
    y = (canvas.height-radius*2)/2
    
    atom.update();
    drawNaughtsAndCrosses();
}

animate();




