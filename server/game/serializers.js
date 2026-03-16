


export function serializeRoomState(room) {

  const game = room.getGame();
  const board = game.getBoard();

  const newState = {
    session: 
    {
        roomId: room.roomId,
        host: room.host,
        type: room.type,
        ruleset: room.ruleset,
        status: room.status,
        countdownEndsAt: room.countdownEndsAt,
        rematchRequest: room.getRematchRequest(),
        drawRequest: room.getDrawRequest()
    },

    players:
    {
        X: 
        {
          playerId: room.players.X?.playerId,
          name: room.players.X?.playerName,
          connectionStatus: room.players.X?.connectionStatus,
          timeLeft: game.timeLeft.X,
          mark: 'X'
        },
        O: 
        {
          playerId: room.players.O?.playerId,
          name: room.players.O?.playerName,
          connectionStatus: room.players.O?.connectionStatus,
          timeLeft: game.timeLeft.O,
          mark: 'O'
          }
    },

    game:
    {
      board: board.board,
      cyclePath: game.cyclePath,
      collapseChoices: game.collapseChoices,
      turn: game.turn,
      winner: game.winner,
      winningLine: game.winningLine,
      nextAction: game.nextAction
    },
      boardHistory: game.boardHistory,

    }

  return newState
  }


  function serializeStore(store, roomId) {


  }
