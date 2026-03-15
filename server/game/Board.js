import C from "./constants.js";

export default class Board {
  constructor() {
    this.board = Array.from({ length: C.BOARD_SIZE }, () =>
      Array.from({ length: C.INNER_BOARD_SIZE }, () => null)
    );
  }

  isFullCell(cell) {
    return (
      Array.isArray(this.board[cell]) &&
      this.board[cell].every(value => value !== null)
    );
  }

  isCollapsedCell(cell) {
    return !Array.isArray(this.board[cell]);
  }

  getBoardArray() {
    return this.board.map(cell =>
      Array.isArray(cell) ? [...cell] : cell
    );
  }
}