import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createGameActions } from "../../game/createGameActions.js";
import { useAppConfig, useGameServices } from "../../providers/AppServicesProvider.jsx";

export function useGameActions() {
  const navigate = useNavigate();
  const { appConfig, refreshAppConfig } = useAppConfig();
  const { gameClient, localGame, sessionStore } = useGameServices();

  const action = useMemo(() => {
    if (!gameClient || !localGame) {
      return null;
    }

    return createGameActions({
      appConfig,
      gameClient,
      localGame,
      refreshAppConfig,
      sessionStore,
      router: {
        go: path => navigate(path),
        replace: path => navigate(path, { replace: true })
      }
    });
  }, [appConfig, gameClient, localGame, navigate, refreshAppConfig, sessionStore]);

  const dispatch = useCallback(async (state, nextAction) => {
    if (!action) {
      return null;
    }

    const outcome = await action.handleAction(state, nextAction);
    if (outcome === "LOCKED") {
      return outcome;
    }

    return outcome;
  }, [action]);

  return { action, dispatch };
}
