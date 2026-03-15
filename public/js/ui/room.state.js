import { convertSeconds } from "../misc/utilities.js";

export default function buildRoomState(state, el={}){
    const bannerState = computeBannerState(state);
    addTextContent(el.mainText, bannerState.text);
    applyBannerState(el.mainText, bannerState);

    addTextContent(el.me.label, computePlayerLabel(state, "me"));
    addTextContent(el.me.name, state.players.me.name);
    addTextContent(el.me.connectionStatus, `${computeStatusIcon(state.players.me.connectionStatus)} ${formatStatus(state.players.me.connectionStatus)}`);
    addTextContent(el.me.time, `${computeTurnIcon(state, state.players.me.mark)} ${convertSeconds(state.players.me.time)}`);
    addTextContent(el.me.mark, `Mark ${state.players.me.mark}`);

    if(!el.opp) return;
    addTextContent(el.opp.label, computePlayerLabel(state, "opponent"));
    addTextContent(el.opp.name, state.players.opponent.name);
    addTextContent(el.opp.connectionStatus, `${computeStatusIcon(state.players.opponent.connectionStatus)} ${formatStatus(state.players.opponent.connectionStatus)}`);
    addTextContent(el.opp.time, `${computeTurnIcon(state, state.players.opponent.mark)} ${convertSeconds(state.players.opponent.time)}`);
    addTextContent(el.opp.mark, `Mark ${state.players.opponent.mark}`);
}

function renderPlayerDisplay(p){
    addTextContent(el[p].name, state.players[p].name);
    addTextContent(el[p].connectionStatus, state.players[p].connectionStatus);
    addTextContent(el[p].time, state.players[p].time);
    addTextContent(el[p].mark, state.players[p].mark);
}


function addTextContent(el, text){
    if(!el) return;
    el.textContent = text;
}

function applyBannerState(el, bannerState) {
    if (!el) return;

    el.dataset.tone = bannerState.tone;
    el.classList.toggle("is-emphasized", Boolean(bannerState.emphasized));
}

function computeBannerState(state) {
    const activeMark = state.game.turn;
    const isPlayersTurn =
      state.session.role !== "spectator" &&
      (state.session.type === "local" || state.session.playerMark === activeMark);
    const rematchRequest = state.session.rematchRequest;
    const drawRequest = state.session.drawRequest;
    const historyIndex = state.ui.historyIndex;
    const totalPositions = state.boardHistory?.length ?? 0;

    if (historyIndex != null && totalPositions > 0) {
        return {
            text: `Reviewing position ${historyIndex + 1} of ${totalPositions}`,
            tone: "waiting",
            emphasized: false
        };
    }

    switch (state.session.status) {
        case "waiting":
            if (state.session.role === "spectator") {
                return { text: "Watching live match", tone: "spectator", emphasized: false };
            }
            return {
                text: state.session.type === "local" ? "Preparing local match" : "Waiting for opponent",
                tone: "waiting",
                emphasized: false
            };

        case "starting":
            return { text: "Match starting", tone: "starting", emphasized: false };

        case "playing":
            if (drawRequest) {
                if (state.session.role === "spectator") {
                    return { text: "Draw request pending", tone: "spectator", emphasized: false };
                }

                return drawRequest.requesterMark === state.session.playerMark
                  ? { text: "Draw requested", tone: "waiting", emphasized: false }
                  : { text: "Respond to draw", tone: toneForMark(state.session.playerMark), emphasized: true };
            }

            if (rematchRequest) {
                if (state.session.role === "spectator") {
                    return { text: "Restart request pending", tone: "spectator", emphasized: false };
                }

                return rematchRequest.requesterMark === state.session.playerMark
                  ? { text: "Restart requested", tone: "waiting", emphasized: false }
                  : { text: "Respond to restart", tone: toneForMark(state.session.playerMark), emphasized: true };
            }

            if (state.game.nextAction === "move") {
                if (state.session.role === "spectator") {
                    return {
                        text: `${activePlayerName(state)}'s turn`,
                        tone: toneForMark(activeMark),
                        emphasized: false
                    };
                }

                return isPlayersTurn
                  ? { text: "Your turn", tone: toneForMark(state.session.playerMark), emphasized: true }
                  : { text: "Opponent's turn", tone: toneForMark(activeMark), emphasized: false };
            }

            if (state.game.nextAction === "collapse") {
                if (state.session.role === "spectator") {
                    return {
                        text: `${activePlayerName(state)} resolving collapse`,
                        tone: toneForMark(activeMark),
                        emphasized: false
                    };
                }

                return isPlayersTurn
                  ? {
                      text: "Choose collapse symbol",
                      tone: toneForMark(state.session.playerMark),
                      emphasized: true
                    }
                  : {
                      text: "Opponent resolving collapse",
                      tone: toneForMark(activeMark),
                      emphasized: false
                    };
            }

            if (state.game.nextAction === "winner") {
                return computeFinishedBannerState(state, rematchRequest);
            }
            break;

        case "finished":
            return computeFinishedBannerState(state, rematchRequest);
    }

    return { text: "", tone: "neutral", emphasized: false };
}

function computeFinishedBannerState(state, rematchRequest) {
    if (rematchRequest) {
        if (state.session.role === "spectator") {
            return { text: "Rematch request pending", tone: "spectator", emphasized: false };
        }

        return rematchRequest.requesterMark === state.session.playerMark
          ? { text: "Rematch requested", tone: "waiting", emphasized: false }
          : {
              text: "Respond to rematch",
              tone: toneForMark(state.session.playerMark),
              emphasized: true
            };
    }

    if (state.game.winner === "draw") {
        return { text: "Draw game", tone: "neutral", emphasized: false };
    }

    if (state.session.role === "spectator") {
        return { text: `${state.game.winner} won`, tone: toneForMark(state.game.winner), emphasized: false };
    }

    return state.game.winner === state.session.playerMark
      ? { text: "You won", tone: toneForMark(state.session.playerMark), emphasized: false }
      : { text: "You lost", tone: toneForMark(state.game.winner), emphasized: false };
}

function activePlayerName(state) {
    return state.players.me.mark === state.game.turn
      ? state.players.me.name
      : state.players.opponent.name;
}

function toneForMark(mark) {
    if (mark === "X") return "mark-x";
    if (mark === "O") return "mark-o";
    return "neutral";
}


function computeMainText(state){
    const gameStatus = state.session.status; //waiting, playing finished
    const nextAction = state.game.nextAction; // move, collapse, winner
    const rematchRequest = state.session.rematchRequest;
    const activePlayer = state.players.me.mark === state.game.turn
      ? state.players.me.name
      : state.players.opponent.name;

    switch(gameStatus){

        case "waiting":
            if (state.session.role === "spectator") {
                return "Watching live match";
            }
            return state.session.type === "local" ? "Preparing local match" : "Waiting for opponent";

        case "starting":
            return "Match begins in a moment";

        case "playing":
            switch(nextAction){

                case "move":
                    return `${activePlayer}'s turn`;
                
                case "collapse":
                    if (state.session.role === "spectator") {
                        return `Waiting for ${activePlayer} to resolve the collapse`;
                    }
                    if (state.session.type !== "local" && state.session.playerMark !== state.game.turn) {
                        return `Waiting for ${activePlayer} to choose the collapse symbol`;
                    }
                    return `Review the cycle and choose the collapse symbol`;

                case `winner`:
                    return state.game.winner === "draw" ? "Draw game" : `${state.game.winner} won!`;
            }

        case "finished":
            if (rematchRequest) {
                if (state.session.role === "spectator") {
                    return "Rematch request pending";
                }

                return rematchRequest.requesterMark === state.session.playerMark
                  ? "Waiting for rematch response"
                  : "Rematch response needed";
            }
            return state.game.winner === "draw" ? "Draw game" : `${state.game.winner} won!`;

    }

    return "";
    
}

function computePlayerLabel(state, slot) {
    if (state.session.role === "spectator") {
        return slot === "me" ? "Player X" : "Player O";
    }

    return slot === "me" ? "You" : "Opponent";
}

function computeStatusIcon(status) {
    switch (status) {
        case "connected":
        case "online":
            return "●";
        case "offline":
            return "○";
        case "left":
            return "−";
        default:
            return "•";
    }
}

function formatStatus(status) {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function computeTurnIcon(state, mark) {
    if (state.session.status === "finished") {
        return state.game.winner === mark ? "★" : "◌";
    }
    return state.game.turn === mark ? "▶" : "○";
}
