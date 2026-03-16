import C from "./constants.js";
import Board from "./Board.js";
import { checkWinner } from "./gameLogic.js";

export default class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.reset();
  }

  reset() {
    this.board = new Board();
    this.turn = "X";
    this.nextAction = C.NEXT_ACTION.MOVE;
    this.winner = null;
    this.winningLine = null;
    this.cyclePath = null;
    this.collapseChoices = null;
    this.symbolIndex = new Map();
    this.moves = [];

    this.boardHistory = [this.board.getBoardArray()];
    this.timerId = null;
    this.timeLeft = { X: C.TIME.TURN_SECONDS, O: C.TIME.TURN_SECONDS };
  }

  gameStarted() {}

  startTimer(onTimeout) {
    if (this.timerId) return false;

    this.timerId = setInterval(() => {
      this.timeLeft[this.turn]--;

      if (this.timeLeft[this.turn] < 1) {
        this.winner = this.turn === "X" ? "O" : "X";
        this.stopTimer();
        onTimeout?.(this.winner);
      }
    }, 1000);

    return true;
  }

  stopTimer() {
    if (!this.timerId) return;
    clearInterval(this.timerId);
    this.timerId = null;
  }

  updateNextAction(action) {
    this.nextAction = C.NEXT_ACTION[action];
  }

  end(ruleset) {
    const result = checkWinner(this.board.getBoardArray(), { ruleset });
    this.winner = result.winner ? (result.resolvedWinner ?? result.winningLines[0]) : this.winner;
    this.winningLine = result.winningCombos?.[0] ?? null;
    this.stopTimer();
  }

  getBoard() {
    return this.board;
  }

  appendBoard() {
    this.boardHistory.push(
      this.board.getBoardArray().map(cell =>
        Array.isArray(cell) ? [...cell] : cell
      )
    );
  }

  getTurn() {
    return this.turn;
  }

  getSymbolIndex() {
    return this.symbolIndex;
  }

  getMoves() {
    return this.moves;
  }

  getMove(idx) {
    return this.moves[idx];
  }

  getCyclePath() {
    return this.cyclePath;
  }

  getCollapseChoices() {
    return this.collapseChoices;
  }

  makeMove(square, symbol) {
    const move = { square, symbol };
    this.moves.push(move);
    return move;
  }

  setCyclePath(cyclePath) {
    this.cyclePath = cyclePath;
  }

  setCollapseChoices(collapseChoices) {
    this.collapseChoices = collapseChoices;
  }

  setNextAction(action) {
    this.nextAction = action;
  }

  setWinner(winner) {
    this.winner = winner;
  }

  setWinningLine(winningLine) {
    this.winningLine = winningLine;
  }

  setTurn(turn) {
    this.turn = turn;
  }
}
