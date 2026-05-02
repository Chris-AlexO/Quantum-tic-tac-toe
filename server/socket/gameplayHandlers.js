import { SOCKET_EVENTS } from "../../shared/game/events.js";
import C from "../game/constants.js";
import * as gameLogic from "../game/gameLogic.js";

export function registerGameplayHandlers(context) {
  const {
    io,
    sock,
    player,
    resolvePlayerRoom,
    getRoomChannelId,
    serializeRoomState,
    emitRoomState,
    persistRoom
  } = context;

  sock.on(SOCKET_EVENTS.MOVE, async (data, ack) => {
    if (!data) return ack?.({ status: "error" });

    const { bigSquare } = data;
    const room = await resolvePlayerRoom();

    if (!room) {
      return ack?.({ status: "error", message: "Room not found" });
    }

    const game = room.getGame();
    const mark = room.getPlayerMark(player);

    const moveData = gameLogic.validateMove(game, bigSquare, mark);
    if (moveData.status === "error") {
      return ack?.(moveData);
    }

    const moves = game.getMoves();
    const isFirstHalf = moves.length % 2 === 0;
    const symbolNumber = Math.floor(moves.length / 2) + 1;
    const symbol = `${mark}${symbolNumber}`;

    game.makeMove(bigSquare, symbol);

    const board = game.getBoard();
    board.board = gameLogic.updateBoard(board, bigSquare, symbol);
    game.appendBoard();

    const symbolIndex = game.getSymbolIndex();

    if (isFirstHalf) {
      symbolIndex.set(symbol, [bigSquare]);
      emitRoomState(room);
      return ack?.({ status: "ok" });
    }

    const existingSquares = symbolIndex.get(symbol) ?? [];
    existingSquares.push(bigSquare);
    symbolIndex.set(symbol, existingSquares);

    const totalMoves = game.getMoves().length;
    const previousMove = game.getMove(totalMoves - 2);
    const bigSquareOfTwin = previousMove.square;

    const cycleResult = gameLogic.checkForCycle(
      game.getMoves(),
      bigSquare,
      bigSquareOfTwin,
      symbol
    );

    game.setTurn(mark === "X" ? "O" : "X");

    if (cycleResult.cycleFound) {
      game.setCyclePath(cycleResult.cyclePath);
      game.setCollapseChoices(
        gameLogic.buildCollapseChoices(
          board.getBoardArray(),
          cycleResult.cyclePath,
          room.ruleset,
          existingSquares.map(choiceSquare => [choiceSquare, symbol])
        )
      );
      game.setNextAction("collapse");

      io.to(getRoomChannelId(room)).emit(SOCKET_EVENTS.CYCLE_FOUND, {
        state: serializeRoomState(room)
      });
      void persistRoom(room);

      return ack?.({ status: "ok" });
    }

    emitRoomState(room);

    return ack?.({ status: "ok" });
  });

  sock.on(SOCKET_EVENTS.COLLAPSE, async (data, ack) => {
    const { square, playerSymbol } = data || {};

    const room = await resolvePlayerRoom();
    if (!room) {
      return ack?.({ status: "error", message: "room not found" });
    }

    const game = room.getGame();
    const board = game.getBoard();
    const path = game.getCyclePath();

    if (!Array.isArray(path)) {
      return ack?.({ status: "error", message: "No cycle to collapse" });
    }

    const collapsibleSquares = path.map(([sq]) => sq);
    if (!collapsibleSquares.includes(square)) {
      return ack?.({
        status: "error",
        message: `square ${square} is not collapsible`
      });
    }

    const collapseChoices = Array.isArray(game.getCollapseChoices?.())
      ? game.getCollapseChoices()
      : [];
    if (!collapseChoices.some(([choiceSquare, choiceSymbol]) => choiceSquare === square && choiceSymbol === playerSymbol)) {
      return ack?.({ status: "error", message: "That collapse choice is not valid" });
    }

    const symbolIndex = game.getSymbolIndex();
    const turn = game.getTurn();

    const collapsedBoard = gameLogic.collapseEntanglement(
      symbolIndex,
      board.getBoardArray(),
      square,
      playerSymbol,
      { ruleset: room.ruleset }
    );

    const finalBoard = gameLogic.checkIfOneSquareRemains(collapsedBoard, turn, {
      ruleset: room.ruleset
    });
    board.board = finalBoard;

    const winnerResult = gameLogic.checkWinner(finalBoard, {
      ruleset: room.ruleset
    });
    game.appendBoard();

    const winningLines = winnerResult.winningLines;
    const winningCombos = winnerResult.winningCombos;

    if (winningLines.length) {
      game.setWinner(winnerResult.resolvedWinner ?? "draw");
      game.setWinningLine(winningCombos);
      game.setNextAction("winner");
      room.clearPendingRequests();
      room.status = C.ROOM_STATUS.FINISHED;
      game.stopTimer();
    } else {
      game.setWinner(null);
      game.setNextAction("move");
      game.setCyclePath(null);
      game.setCollapseChoices(null);
    }

    emitRoomState(room);

    return ack?.({ status: "ok", message: "collapse" });
  });
}
