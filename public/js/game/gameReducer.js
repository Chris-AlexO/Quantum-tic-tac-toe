 
 function gameReducer(state, action) {
    switch (action.type) {
        case "SET_GAME_STATE":
            return {
                ...state,
                game: {
                    ...state.game,
                    board: action.gameState.board,
                }
            };


        default:
            return state;
    }
}

export { gameReducer };