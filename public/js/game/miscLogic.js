
export function isPlayerTurn(state) {
  return state.game.turn === state.players.me.mark;
}
