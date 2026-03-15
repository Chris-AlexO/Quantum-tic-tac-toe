import buildBoard  from "./ui/board.elements.js";
import buildRoom from "./ui/room.elements.js";
import { buildBoardState } from "./ui/board.state.js";
import buildRoomState from "./ui/room.state.js";

const CELL_SIZE = 200;

export function renderGameBoard(state, options = {}) {
    const clickables = []

    const svg = buildBoard(CELL_SIZE, clickables);
    buildBoardState(svg, state, clickables, CELL_SIZE, options);
    return { svg, clickables };
};

export function renderRoomState(state) {
    const elements =  buildRoom();
    buildRoomState(state, elements);
    return elements.r;

}
