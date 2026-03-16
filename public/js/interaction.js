import {
  getState,
  resetStateForMenu,
  setPreferredRuleset,
  setToastMessage
} from "./game/state.js";

export function createActions({emitter, router, localGame, appConfig}){
    let pendingBoardAction = false;

    const getActivePlayerSession = () => {
        const state = getState();
        if (
          state.session.role !== "player" ||
          !state.session.roomId ||
          !["waiting", "starting", "playing"].includes(state.session.status)
        ) {
          return null;
        }

        return state;
    };

    const routeToExistingGame = (state, message = "Finish your current match before starting another one.") => {
        if (!state?.session?.roomId) {
          return false;
        }

        setToastMessage(message);
        if (state.session.type === "local") {
          router.go("/game/local");
          return true;
        }

        router.go(`/game/mp/${state.session.roomId}`);
        return true;
    };

    const handleOccupiedAck = ack => {
      if (!ack?.roomId || !ack?.state) {
        return false;
      }

      return routeToExistingGame(
        {
          ...getState(),
          session: {
            ...getState().session,
            roomId: ack.roomId,
            type: ack.state.session?.type ?? "mp",
            status: ack.state.session?.status ?? "playing",
            role: ack.role ?? "player"
          }
        },
        ack.message || "Finish your current match before starting another one."
      );
    };

    const computeInteractionMode = (state) =>
    {   
        if (state.session.status !== "playing") return "LOCKED";
        if (state.session.role === "spectator") return "LOCKED";
        if (state.session.type !== "local" && state.players.me.mark !== state.game.turn) return "LOCKED";
        if (state.game.nextAction === "move") return "MOVE";
        if (state.game.nextAction === "collapse") return "COLLAPSE";
        if (state.game.nextAction === "winner") return "WINNER";
        return "LOCKED";
    }

return {

    //handle action should return the state from emmiter acks
    async handleAction(state, action) 
    {
        const mode = computeInteractionMode(state);

        if (mode === "LOCKED") return mode;
        if (pendingBoardAction) return "PENDING";

        switch (action.type) 
        {
            case "BOARD_CELL_CLICK":
            if (mode !== "MOVE") return;
            if (state.session.type === "local") {
                return localGame.handleAction(state, action);
            }
            pendingBoardAction = true;
            try {
                await emitter.sendMove(action.cellIndex);
                return mode;
            } catch (error) {
                setToastMessage(error?.message || "Move rejected. Try again.");
                return "REJECTED";
            } finally {
                pendingBoardAction = false;
            }

            case "COLLAPSE_SYMBOL_CLICK":
            if (mode !== "COLLAPSE") return;
            if (state.session.type === "local") {
                return localGame.handleAction(state, action);
            }
            pendingBoardAction = true;
            try {
                await emitter.sendCollapse(action.cellIndex, action.symbol);
                return mode;
            } catch (error) {
                setToastMessage(error?.message || "Collapse rejected. Try again.");
                return "REJECTED";
            } finally {
                pendingBoardAction = false;
            }
        }

        return mode;
    },

    async handleButtonAction(action)
    {
        let ack;
        switch (action.type)
        {
            case "MAIN_MENU":
            if (getState().session.type === "local") {
                localGame.stop();
                resetStateForMenu();
            }
            router.go("/");
            break;
            
            case "LOCAL_MATCH":
            if (!action.force) {
                const activeSession = getActivePlayerSession();
                if (activeSession) {
                    routeToExistingGame(activeSession, "Finish your current match before starting a new one.");
                    return;
                }
            }
            router.go("/game/local");
            break;  

            case "QUICK_MATCH":
            if (!appConfig?.multiplayerEnabled) {
                setToastMessage("PostgreSQL is offline. Only local games are available.");
                return;
            }
            if (!action.force) {
                const activeSession = getActivePlayerSession();
                if (activeSession) {
                    routeToExistingGame(activeSession, "Finish your current match before starting another one.");
                    return;
                }
            }
            const quickMatchAck = await emitter.quickMatch();
            if (!quickMatchAck) {
                setToastMessage("Unable to find a room right now. Please try again.");
                return;
            }
            if (quickMatchAck.message === "Player already in a room" || quickMatchAck.status === "occupied") {
                handleOccupiedAck(quickMatchAck);
                return;
            }
            if (quickMatchAck.status !== "ok" || !quickMatchAck.roomId) {
                setToastMessage(quickMatchAck.message || "Unable to find a room right now. Please try again.");
                return;
            }
            router.go(`/game/mp/${quickMatchAck.roomId}`);
            break;

            case "JOIN_MATCH":
            if (!appConfig?.multiplayerEnabled) {
                setToastMessage("PostgreSQL is offline. Only local games are available.");
                return;
            }
            if (!action.roomId) {
                setToastMessage("Enter a room id to continue.");
                return;
            }
            if (!action.force) {
                const activeSession = getActivePlayerSession();
                if (activeSession && activeSession.session.type === "mp" && activeSession.session.roomId !== action.roomId) {
                    routeToExistingGame(activeSession, "Finish your current match before opening another room.");
                    return;
                }
                if (activeSession?.session.type === "local") {
                    routeToExistingGame(activeSession, "Finish your current local match before opening a live room.");
                    return;
                }
            }
            ack = await emitter.joinRoomById(action.roomId);
            if (!ack) {
                setToastMessage("That room does not exist.");
                return;
            }
            if (ack.status === "occupied") {
                handleOccupiedAck(ack);
                return;
            }
            router.go(`/game/mp/${ack.roomId}`);
            break;

            case "OPEN_EXISTING_GAME":
            if (!action.roomId && action.local !== true) {
                return;
            }
            setToastMessage(action.message || "Finish your current match before starting another one.");
            if (action.local) {
                router.go("/game/local");
                return;
            }
            router.go(`/game/mp/${action.roomId}`);
            return;

            case "DEV_ADMIN":
            router.go("/admin/dev-db");
            break;

            case "ACTIVE_GAMES":
            if (!appConfig?.multiplayerEnabled) {
                setToastMessage("PostgreSQL is offline. Active games are unavailable.");
                return;
            }
            router.go("/games/active");
            break;

            case "SAVE_NAME":
            ack = await emitter.sendPlayerName(action.name);
            if(ack) console.log("Name saved");
            break;

            case "SET_RULESET":
            setPreferredRuleset(action.ruleset);
            setToastMessage(
              action.ruleset === "goff"
                ? "Allan Goff rules selected for new games."
                : "House rules selected for new games."
            );
            break;

            case "REMATCH":
            case "REMATCH_REQUEST":
            if (getState().session.type === "local") {
                localGame.rematch();
                return;
            }

            ack = await emitter.requestRematch();
            if (!ack) {
                setToastMessage("Unable to send rematch request right now.");
            }
            break;

            case "REMATCH_ACCEPT":
            ack = await emitter.respondToRematch(true);
            if (!ack) {
                setToastMessage("Unable to accept the rematch right now.");
            }
            break;

            case "REMATCH_DECLINE":
            ack = await emitter.respondToRematch(false);
            if (!ack) {
                setToastMessage("Unable to decline the rematch right now.");
            }
            break;

            case "LOCAL_RESTART":
            localGame.restart();
            setToastMessage("Local match restarted.");
            break;

            case "DRAW_REQUEST":
            ack = await emitter.requestDraw();
            if (!ack) {
                setToastMessage("Unable to send the draw request right now.");
            }
            break;

            case "DRAW_ACCEPT":
            ack = await emitter.respondToDraw(true);
            if (!ack) {
                setToastMessage("Unable to accept the draw right now.");
            }
            break;

            case "DRAW_DECLINE":
            ack = await emitter.respondToDraw(false);
            if (!ack) {
                setToastMessage("Unable to decline the draw right now.");
            }
            break;
        }
    }

}
}
