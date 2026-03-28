import buildBoard from "./ui/board.elements.js";
import buildRoom from "./ui/room.elements.js";
import { buildBoardState } from "./ui/board.state.js";
import buildRoomState, {
  renderRoomChromeState,
  renderRoomTimerState
} from "./ui/room.state.js";

const CELL_SIZE = 200;

export function renderGameBoard(state, options = {}) {
  const clickables = [];
  const svg = buildBoard(CELL_SIZE, clickables);

  buildBoardState(svg, state, clickables, CELL_SIZE, options);

  return { svg, clickables };
}

export function renderRoomState(state, options = {}) {
  const elements = buildRoom();
  buildRoomState(state, elements, options);
  return elements.r;
}

export function createRoomView() {
  const elements = buildRoom();

  return {
    root: elements.r,
    elements,
    render(state, options = {}) {
      buildRoomState(state, elements, options);
    },
    renderChrome(state, options = {}) {
      renderRoomChromeState(state, elements, options);
    },
    renderTimers(state, options = {}) {
      renderRoomTimerState(state, elements, options);
    }
  };
}
