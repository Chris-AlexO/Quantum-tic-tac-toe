import { drawBoard } from "./gameUI.js";
import { quickMatch } from "./emitters.js";
import { setPlayerName , getRoomId, getTurn, getPlayerName, getMark, getState, setToastMessage, getToastMessage, setRoomId, getModalMessage} from "./store.js";
import leoProfanity from "https://cdn.jsdelivr.net/npm/leo-profanity/+esm";
import { Game } from "./gameLogic.js";
import { subscribe } from "./store.js";
import { x } from "./drawGame.js";
import { convertSeconds } from "./utilities.js";

function cleanName(name) {
  return leoProfanity.clean(name);  // replaces bad words with ****
}

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/css/style.css";
document.head.appendChild(link);


const vw = window.innerWidth/2;
const vh = window.innerHeight/2;

class View {

constructor(builderFn, classPrefix){
    this.container = document.createElement('div');
    this.classPrefix = classPrefix || 'custom-';

    this.container.classList.add(classPrefix + 'View', 'view-container');
    this.unsubscribe = null;

    this.builder = builderFn || null;
    this._api = null;

    
    this.vw = window.innerWidth/2;
    this.vh = window.innerHeight/2;

    this._infoBoxUlLeft = null;
    this._infoBoxUlRight = null;



}


mount(){
if(this.unsubscribe) return; // already mounted
this.unsubscribe = subscribe(this.updateView.bind(this));
}

unmount(){
if(this.unsubscribe){
    this.unsubscribe();
    this.unsubscribe = null;
}
}


get api(){
    if(!this._api && this.builder){
        this._api = this.builder({ mount : this.container });
    }
    return this._api;
}

/*setReady(flag) { this._api?.setReady?.(flag); console.log(`set board readt to: ${flag}`)}
destroy() { this._api?.destroy?.(); this.container.remove(); }
setOnSymbolClick(fn){this._api?.setOnSymbolClick(fn);};
setToken(token) {this._api?.setToken(token);}
showCollapseSquares(squares) {this._api?.showCollapseSquares(squares);}
showWin(win) {this._api?.showWin(win);}*/



updateView(state) {
  // create the container once
  //console.log("updating view:", this.container.className, state);
  const side = "left";

  const gameStatus = state.gameStatus;

  if(state.toastMessage){
    this.showToast(state.toastMessage);
  }

  if(state.modalMessage){
    console.log('showing modal')
    this.showModal(state.modalMessage);
  }


  if(!state || !state.roomId) return;

  const turn = () => {
                      if(state.gameStatus === 'finished'){
                        if(state.winner === state.mark) return "You won!";
                        else if(state.winner === 'draw') return "It's a draw!";
                        else return "You lost!";
                      }
                      else if(state.gameStatus === 'waiting') {return "Waiting for opponent...";}
                      if(state.turn === state.mark) {
                        switch (state.nextAction){
                          case 'move':
                            return "Your turn!";
                          case 'collapse':
                            return 'Your Turn! Collapse a square!';
                          default:
                            return 'Your turn';

                        }

                        }
                      else{ return "Opponent's turn!"}}


  const opponentName = gameStatus === "waiting" ? "Waiting for opponent..." : state.opponentName

  const textLists = ["Room ID: "+state.roomId, turn()];
  const rightTextLists = [state.mark + ": " + state.playerName||"", "Time left: "+ convertSeconds(state.playerTime) ,
                           "Opponent: " + opponentName, "Time left: "+ convertSeconds(state.opponentTime)];
  if(!textLists.length) return;
  //this._textLists
  //if (!this._textLists) this._textLists = {};
  //if (this._textLists[side]) return this._textLists[side];

  this.api?.updateState?.(state);

  if(!this._infoBoxUlLeft){

  const boxLeft = document.createElement("div");
  Object.assign(boxLeft.style, {
    position: "absolute",
    left: "10px",
    margin: "0px",
    transform: "translate(0px,0px)",
  });

  const boxRight = document.createElement("div");
  Object.assign(boxRight.style, {
    right: "10px",
  })

  boxLeft.classList.add("info-box");
  boxRight.classList.add("info-box");

  const ul = document.createElement("ul");
  Object.assign(ul.style, {
    listStyle: "none",
    margin: 0,
    padding: 0,
    textAlign: side === "right" ? "right" : "left",
  });

  const rightUl = document.createElement("ul");
  Object.assign(rightUl.style, {
    listStyle: "none",
    margin: 0,
    padding: 0,
    //textAlign: "right",
  });



  for(const text of textLists){
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  }

  for (const text of rightTextLists){
    const li = document.createElement("li");
    li.textContent = text;
    rightUl.appendChild(li);
  }

  boxLeft.appendChild(ul);
  boxRight.appendChild(rightUl);

  this.container.appendChild(boxLeft);
  this.container.appendChild(boxRight);

  this._infoBoxUlLeft = ul;
  this._infoBoxUlRight = rightUl;
}

  this.addToInfoBox(this._infoBoxUlLeft, textLists);
  this.addToInfoBox(this._infoBoxUlRight, rightTextLists);

  //this._textLists[side] = ul;
  //return ul;
}


addToInfoBox(infoBoxEl, textList) {
  infoBoxEl.innerHTML = ""; // clear existing
  for(const text of textList) {
    const li = document.createElement("li");
    li.textContent = text;
    infoBoxEl.appendChild(li);
  }
}

addElement(elTag, attribs = {}, parent) {
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

  (parent || this.container).appendChild(el);
  return el;
}

addButton(x, y, text, handler, parent) {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      position: "absolute",
     left: `${x}`,
      top: `${y}`,
      width: "250px",
      height: "50px",
      transform: 'translate(-50%,-50%)',
    });
    btn.addEventListener("click", handler);

    (parent || this.container).appendChild(btn); // 👈 goes into the View container
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

showToast(message=getToastMessage(), buttonHandler, duration = 1500) {
  const toast = document.querySelector('.toast');
  console.log("Showing toast:", message);
  if (toast) {

  if(buttonHandler){
    const btn = document.createElement("button");
    btn.textContent = "Join Room";
    btn.style.marginTop = "10px";
    btn.addEventListener("click", () => {
      buttonHandler();
      toast.classList.remove("show");
      setToastMessage(null);
    });
    toast.appendChild(btn);
  }

  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setToastMessage(null);
  }, duration);
  }
}


showModal(message = getModalMessage()){
  const modal = document.querySelector('.modal');
  const modalHeader = document.querySelector('.modal-header');
  const modalBody = document.querySelector('.modal-body');
  const modalOverlay = document.querySelector('.modal-overlay');
  const exitButton = document.querySelector('.modal-exit');
  modalOverlay.style.display = 'block';
  modal.classList.add('is-open');
  //document.body.classList.add('modal-open');
  modalBody.textContent = message;

  function closeModal(){
  modal.classList.remove('is-open');
  modalOverlay.style.display = 'none';
  exitButton.removeEventListener('click', closeModal); // clean up listener
  modalOverlay.removeEventListener('click', closeModal);
}

  exitButton.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);

}

showCountdown(time){


}




}


export class ViewManager{

    constructor(container = document.body){
        this.container = container;
        this.activeView = null;
        this._unsubscribe = null;
        this._lastState = null;
        this.views = new Map();

    }

register(view){
    if(!this.views.has(view)){
        this.container.appendChild(view.container);}
        view.container.style.display = "none"; // ensure hidden initially
        this.views.set(view.classPrefix,view);
        //console.log(`registering: ${view.container.className} under ${view.container.parentElement}`);
    return view;
}

connect(){
    if(this._unsubscribe) return; // already connected
    this._unsubscribe = subscribe(this._handleStateChange.bind(this));
    //console.log("ViewManager connected to store");
    const toast = document.createElement('div');
    toast.className = 'toast';
    this.container.appendChild(toast);
}

_handleStateChange(newState){
    if(this.activeView && this.activeView.updateView && newState !== this._lastState){
      if(newState.view && newState.view!==this.activeView.classPrefix){
        this.switchView(this.views.get(newState.view));
      }
        this.activeView?.updateView?.(newState);
        this._lastState = newState;
    }
}

switchView(view){
    if(this.activeView  && this.activeView!==view){
    this.activeView.container.style.display = 'none';}

    view.api;
    view.container.style.display = 'block';
    this.activeView = view;
    this.activeView?.updateView?.(getState());
    //console.log(`activated: ${this.activeView.container.className}`);
    


}

}

export const MainView = new View(null,'main');
//const toast=MainView.addElement('div', { style: { height: '20vh', x:vw/2, y:vh/2 }, className:'toast' }); // spacer

MainView.addForm(vw, vh - 100, "Enter your name...", (value) => {
  console.log("User entered:", value);
});
MainView.addButton(`${vw}px`, `${vh}px`, "Quick Match", quickMatch);
//MainView.addButton(vw, vh+65, "Join Match")



export const GameView = new View(drawBoard, 'game');
GameView.addButton('50%', '90%', "Back to Multiplayer Menu", () => {
  const base = window.location.origin + "/multiplayer";
  console.log(window.location.origin);
  window.location.href = base;
});


export const ErrorView = new View(null, 'error');
const modal = ErrorView.addElement('div', { style: { height: '40vh', x:vw/2, y:vh/2 }, className:'modal-body' }); // spacer
ErrorView.addElement('h2', { text: "An error occurred", x:'50%' , y: '50%', style: { color: 'red', textAlign: 'center' } }, modal);
ErrorView.addElement('p', { text: "Please try refreshing the page or starting a new game", x: vw, y: vh, style: { color: 'white', textAlign: 'center' } }, modal);
ErrorView.addButton('50%', '50%', "Back to Multiplayer Menu", () => {
  const base = window.location.origin + "/multiplayer";
  console.log(window.location.origin);
  window.location.href = base;
}, modal);
//GameView.addTextList('left');
//GameView.addTextList('right');
