import { setToastMessage, getToastMessage, getModalMessage} from "../game/state.js";
import leoProfanity from "https://cdn.jsdelivr.net/npm/leo-profanity/+esm";


function cleanName(name) {
  return leoProfanity.clean(name);  // replaces bad words with ****
}

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/css/style.css";
document.head.appendChild(link);


const vw = window.innerWidth/2;
const vh = window.innerHeight/2;

export class View {

  constructor(props, state)
  {

      this.container = document.createElement('div');
      this.classPrefix = props?.classPrefix || 'custom-';//-------

      this.container.classList.add('view-container');

      this.builder = props?.builderFn || null; //-------
 
      this.vw = window.innerWidth/2;
      this.vh = window.innerHeight/2;

      this.state = null;

      this.createEventHandler = props?.eventHandlerFactory;
      this.turnOffEventHandlers = null;

      //this.router = props?.router || null;

      this.action = props.action || null;
      this.emitter = props?.emitter || null;
      this.reciever = props?.reciever || null;
      this.dispatch = props.dispatch || null;

      this.domListenersAbort = null;
      this.theme=null;

}


mount(root)
{
  this.turnOffEventHandlers = this.createEventHandler?.();

  this.domListenersAbort = new AbortController();
  root.appendChild(this.container);
}

unmount(root)
{
  this.turnOffEventHandlers?.();
  this.turnOffEventHandlers = null;
  
  this.domListenersAbort?.abort();
  this.domListenersAbort = null;
  
  if (this.container.parentNode === root) {
    root.removeChild(this.container);
  } else {
    this.container.remove();
  }
}



render(state)
{

}

renderError(message){
  this.container.replaceChildren();
  this.container.classList.add("error-view");

  const panel = document.createElement("section");
  panel.className = "error-panel";

  const eyebrow = document.createElement("p");
  eyebrow.className = "main-eyebrow";
  eyebrow.textContent = "Unavailable";

  const title = document.createElement("h1");
  title.className = "error-title";
  title.textContent = "We couldn't load this view";

  const body = document.createElement("p");
  body.className = "error-copy";
  body.textContent = message;

  const actions = document.createElement("div");
  actions.className = "error-actions";

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "main-primary-button";
  backButton.textContent = "Back to main menu";
  backButton.addEventListener("click", () => {
    this.action?.handleButtonAction?.({ type: "MAIN_MENU" });
  }, { signal: this.domListenersAbort.signal });

  actions.appendChild(backButton);
  panel.append(eyebrow, title, body, actions);
  this.container.appendChild(panel);
}

updateView(state) {
 
}

tick(){

}

addElement(elTag, attribs = {}, parent, x, y,) {
  const el = document.createElement(elTag);

  for (const [key, value] of Object.entries(attribs)) {
    if (value == null || value === false) {
      continue;
    }
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
    if (value === true) {
      el.setAttribute(key, key);
      continue;
    }
    // fallback for true attributes (id, aria-*, data-*, role, etc.)
    el.setAttribute(key, value);
  }

  (parent || this.container).appendChild(el);
  return el;
}

addButton(x, y, text, handler, handlerArguments, type, parent) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.classList.add(type);
    Object.assign(btn.style, {
      position: "absolute",
     left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%,-50%)',
    });
    btn.addEventListener("click", () => handler(handlerArguments));

    (parent || this.container).appendChild(btn);
    return btn;
  }

  addForm(x, y, placeholder = "Type here...", submitHandler, submitHandlerArgs) {
  const form = document.createElement("form");
  Object.assign(form.style, {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
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
    //padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "2px solid #ccc",
    borderRadius: "0.5rem",
    outline: "none",
  });

  form.appendChild(input);

  input.addEventListener("input", (e) => {
    submitHandlerArgs.name = e.target.value;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value;
    submitHandler(submitHandlerArgs);
  });

  this.addButton(x+12.5, y-1.5 , "Save", submitHandler, submitHandlerArgs, "form-button");

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
