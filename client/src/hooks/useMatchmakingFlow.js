import { useCallback, useEffect, useRef, useState } from "react";

const ROUTE_DELAY_MS = 700;

export function useMatchmakingFlow({
  appConfig,
  gameClient,
  isConfigLoading,
  navigate,
  ruleset,
  savedName
}) {
  const [phase, setPhase] = useState("searching");
  const [waitingRoomId, setWaitingRoomId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const resolvedRef = useRef(false);
  const cancelledRef = useRef(false);
  const waitingRoomIdRef = useRef(null);
  const resolveTimeoutRef = useRef(null);

  useEffect(() => {
    waitingRoomIdRef.current = waitingRoomId;
  }, [waitingRoomId]);

  const clearRouteTimeout = useCallback(() => {
    if (!resolveTimeoutRef.current) {
      return;
    }

    clearTimeout(resolveTimeoutRef.current);
    resolveTimeoutRef.current = null;
  }, []);

  const resolveToRoute = useCallback((path) => {
    if (cancelledRef.current || resolvedRef.current) {
      return;
    }

    resolvedRef.current = true;
    resolveTimeoutRef.current = setTimeout(() => {
      if (!cancelledRef.current) {
        navigate(path, { replace: true });
      }
    }, ROUTE_DELAY_MS);
  }, [navigate]);

  const markFound = useCallback((path) => {
    setPhase("found");
    setErrorMessage("");
    resolveToRoute(path);
  }, [resolveToRoute]);

  const markError = useCallback((message) => {
    setPhase("error");
    setErrorMessage(message || "Unable to complete search");
  }, []);

  const startSearch = useCallback(async () => {
    try {
      const ack = await gameClient.quickMatch(ruleset);
      if (cancelledRef.current) {
        return;
      }

      if (ack?.status === "occupied" || ack?.message === "Player already in a room") {
        markFound(ack.state?.session?.type === "local" ? "/game/local" : `/game/mp/${ack.roomId}`);
        return;
      }

      if (!ack || ack.status !== "ok" || !ack.roomId) {
        markError(ack?.message || "Unable to find a room right now.");
        return;
      }

      if (ack.kind === "JOIN" || ack.mark === "O") {
        markFound(`/game/mp/${ack.roomId}`);
        return;
      }

      setWaitingRoomId(ack.roomId);
      setPhase("searching");
      setErrorMessage("");
    } catch (error) {
      if (!cancelledRef.current) {
        markError(error?.message);
      }
    }
  }, [gameClient, markError, markFound, ruleset]);

  useEffect(() => {
    if (isConfigLoading || !appConfig.multiplayerEnabled || !savedName) {
      return undefined;
    }

    cancelledRef.current = false;
    resolvedRef.current = false;

    const unsubscribe = gameClient.subscribeToRoomState(serverState => {
      if (
        cancelledRef.current ||
        resolvedRef.current ||
        !waitingRoomIdRef.current ||
        !serverState
      ) {
        return;
      }

      if (serverState.session?.roomId !== waitingRoomIdRef.current) {
        return;
      }

      const hasBothPlayers = Boolean(
        serverState.players?.X?.playerId &&
        serverState.players?.O?.playerId
      );

      if (hasBothPlayers) {
        markFound(`/game/mp/${waitingRoomIdRef.current}`);
      }
    });

    void startSearch();

    return () => {
      cancelledRef.current = true;
      unsubscribe?.();
      clearRouteTimeout();
    };
  }, [
    appConfig.multiplayerEnabled,
    clearRouteTimeout,
    gameClient,
    isConfigLoading,
    markFound,
    savedName,
    startSearch
  ]);

  const cancelSearch = useCallback(async () => {
    cancelledRef.current = true;
    clearRouteTimeout();

    const roomId = waitingRoomIdRef.current;
    if (roomId) {
      try {
        await gameClient.leaveGame({ roomId });
      } catch {
        // Best effort only.
      }
    }

    navigate("/", { replace: true });
  }, [clearRouteTimeout, gameClient, navigate]);

  return {
    cancelSearch,
    errorMessage,
    phase,
    waitingRoomId
  };
}
