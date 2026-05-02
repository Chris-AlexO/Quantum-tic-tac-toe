import {
  cloneBoard,
  createBoard,
  isCollapsedCell,
  isFullCell
} from "../../shared/game/rulesEngine.js";

export default class Board {
  constructor() {
    this.board = createBoard();
  }

  isFullCell(cell) {
    return isFullCell(this.board, cell);
  }

  isCollapsedCell(cell) {
    return isCollapsedCell(this.board, cell);
  }

  getBoardArray() {
    return cloneBoard(this.board);
  }
}
