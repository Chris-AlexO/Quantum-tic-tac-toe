import { useEffect, useState } from "react";
import { createGameEventBridge } from "../../game/createGameEventBridge.js";

export function useGameBootstrap({
  action,
  gameClient,
  local = false,
  localGame,
  multiplayerEnabled,
  roomId,
  savedName,
  sessionStore
}) {
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (local || !savedName || !multiplayerEnabled) {
      return undefined;
    }

    const turnOff = createGameEventBridge({ sessionStore });
    return () => {
      turnOff?.();
    };
  }, [local, multiplayerEnabled, savedName, sessionStore]);

  useEffect(() => {
    if (!action || !gameClient || !localGame) {
      return undefined;
    }

    if (!local && (!savedName || !multiplayerEnabled || !roomId)) {
      return undefined;
    }

    let cancelled = false;

    const boot = async () => {
      setLoadError("");

      try {
        if (local) {
          await localGame.hydrateOrStart();
          return;
        }

        const entry = await gameClient.enterRoom(roomId);
        if (cancelled) {
          return;
        }

        if (entry?.status === "nogame") {
          setLoadError(`Cannot find this game ${roomId}`);
          return;
        }

        if (entry?.status === "occupied") {
          action.handleButtonAction({
            type: GAME_ACTIONS.OPEN_EXISTING_GAME,
            roomId: entry.roomId,
            local: entry.state?.session?.type === "local",
            replace: true,
            message: entry.message
          });
          return;
        }

        if (entry?.status === "ok") {
          sessionStore.applyServerState(entry.state, entry.mark, entry.role);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error?.message || "Unable to load this game");
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      sessionStore.clearTimeInterval();

      if (local) {
        localGame.stop();
      }
    };
  }, [action, gameClient, local, localGame, multiplayerEnabled, roomId, savedName, sessionStore]);

  return { loadError };
}
