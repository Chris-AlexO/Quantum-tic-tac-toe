//import { gameReducer } from './gameReducer.js';
import { getState } from './state.js';

//I should validate handleButtonAction here as well. Maybe ensure the user has a playerName or whatevs

export function createDispatcher(handleAction) {

  const dispatch = async (currState = null, action) => {

    const state = currState; //|| getState();

    //Actually handle the action
    const outcome = await handleAction(state, action);
    if (outcome === "LOCKED") 
    {
      console.debug("Action ignored due to LOCKED state:", action);
      return outcome;
    }

    return outcome;
  }

  return dispatch;
}








// Called whenever user clicks on clickable part of board.
function dispatch(currState = null, action) 
{
  let state = currState || getState();

  //Actually handle the action
  const outcome = handleAction(state, action);
  if (outcome === "LOCKED") 
  {
    console.debug("Action ignored due to LOCKED state:", action);
    return;
  }

  //Otherwise network message is sent and the return message will update the client

  

  //After all network side effects, handle state update on client side
  //state = gameReducer(state, action);
  //setState(state);
  //render(state);
}
