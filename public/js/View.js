import { drawBoard } from "./gameUI.js";
import { quickMatch } from "./emitters.js";
import { setPlayerName } from "./store.js";
import leoProfanity from "https://cdn.jsdelivr.net/npm/leo-profanity/+esm";
import { Game } from "./gameLogic.js";

function cleanName(name) {
  return leoProfanity.clean(name);  // replaces bad words with ****
}

const vw = window.innerWidth/2;
const vh = window.innerHeight/2;

class View {

constructor(builderFn, classPrefix){
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
  position: "absolute", // attach to viewport, not document flow
  top: "0",
  left: "0",
  width: "100vw",   // full viewport width
  height: "100vh",
  zIndex:1,  // full viewport height,
  display : 'none'
});
    this.container.className = classPrefix + 'view';

    this.builder = builderFn || null;
    this._api = null;

}


get api(){
    if(!this._api && this.builder){
        this._api = this.builder({ mount : this.container });
    }
    return this._api;
}

setReady(flag) { this._api?.setReady?.(flag); console.log(`set board readt to: ${flag}`)}
updateState(s) { this._api?.updateState?.(s); }
destroy() { this._api?.destroy?.(); this.container.remove(); }
setOnCellClick (fn) {this._api?.setOnCellClick(fn); console.log(`set onCellClick to ${fn.name}`)}
setOnSymbolClick(fn){this._api?.setOnSymbolClick(fn);};
setToken(token) {this._api?.setToken(token);}
showCollapseSquares(squares) {this._api?.showCollapseSquares(squares);}
showWin(win) {this._api?.showWin(win);}
talk() {this._api?.talk();}

addTextList(side = "left") {
  // create the container once
  if (!this._textLists) this._textLists = {};
  if (this._textLists[side]) return this._textLists[side];

  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    top: "10px",
    [side]: "10px",
    color: "pink",
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    zIndex: 1000,
  });

  const ul = document.createElement("ul");
  Object.assign(ul.style, {
    listStyle: "none",
    margin: 0,
    padding: 0,
    textAlign: side === "right" ? "right" : "left",
  });

  box.appendChild(ul);
  this.container.appendChild(box);

  this._textLists[side] = ul;
  return ul;
}

appendText(side, text) {
  const ul = this.addTextList(side);
  const li = document.createElement("li");
  li.textContent = text;
  ul.appendChild(li);
  return li; // keep if you want to remove later
}

removeText(side, li) {
  const ul = this._textLists?.[side];
  if (ul && li && ul.contains(li)) {
    ul.removeChild(li);
  }
}

addElement(elTag, attribs = {}) {
  const el = document.createElement(elTag);

  for (const [key, value] of Object.entries(attribs)) {
    if (key === "style" && value && typeof value === "object") {
      Object.assign(el.style, value);
      continue;
    }
    if (key === "class" || key === "className") {
      el.className = value;
      continue;
    }
    if (key === "text" || key === "textContent") {
      el.textContent = value;
      continue;
    }
    if (key === "html" || key === "innerHTML") {
      el.innerHTML = value;
      continue;
    }
    if (key === "dataset" && value && typeof value === "object") {
      Object.assign(el.dataset, value);
      continue;
    }
    if (key.startsWith("on") && typeof value === "function") {
      // e.g., onClick, onMouseenter
      el.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }
    // fallback for true attributes (id, aria-*, data-*, role, etc.)
    el.setAttribute(key, value);
  }

  this.container.appendChild(el);
  return el;
}

addButton(x, y, text, handler) {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: "250px",
      height: "50px",
      transform: 'translate(-50%,-50%)',
    });
    btn.addEventListener("click", handler);

    this.container.appendChild(btn); // 👈 goes into the View container
    return btn;
  }

  addForm(x, y, placeholder = "Type here...", onSubmit) {
  const form = document.createElement("form");
  Object.assign(form.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    transform: "translate(-50%, -50%)",
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  });

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  Object.assign(input.style, {
    flex: "1",
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "2px solid #ccc",
    borderRadius: "0.5rem",
    outline: "none",
  });

  /*const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit";
  Object.assign(submit.style, {
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    border: "none",
    borderRadius: "0.5rem",
    background: "#0d6efd",
    color: "#fff",
    cursor: "pointer",
  });*/

  form.appendChild(input);
  //form.appendChild(submit);

  input.addEventListener("input", () => {
    setPlayerName(cleanName(input.value));
    //onChange?.(state.value);
  });


  this.container.appendChild(form);
  return { form, input, /*submit*/ };
}

makeChild(element){
    this.container.appendChild(element);
}

}


export class ViewManager{

    constructor(container = document.body){
        this.container = container;
        this.activeView = null;
        this.views = new Set();

    }

register(view){
    if(!this.views.has(view)){
        
        this.container.appendChild(view.container);}

        view.container.style.display = "none"; // ensure hidden initially
        this.views.add(view);

        console.log(`registering: ${view.container.className} under ${view.container.parentElement}`);

    return view;
}


switchView(view){
    if(this.activeView  && this.activeView!==view){
    this.activeView.container.style.display = 'none';}

    view.api;
    view.container.style.display = 'block';
    this.activeView = view;
    console.log(`activated: ${this.activeView.container.className}`);
    view.talk();

}

}

export const MainView = new View(null,'main');


MainView.addForm(vw, vh - 100, "Enter your name...", (value) => {
  console.log("User entered:", value);
});
MainView.addButton(vw, vh, "Quick Match", quickMatch);
//MainView.addButton(vw, vh+65, "Join Match")



export const GameView = new View(drawBoard, 'game');
GameView.addTextList('left');
GameView.addTextList('right');
