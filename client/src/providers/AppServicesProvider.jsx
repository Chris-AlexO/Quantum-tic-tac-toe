import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createLocalGameController } from "../game/createLocalGameController.js";
import { createGameSessionStore } from "../game/sessionStore.js";
import { createGameClient } from "../services/gameClient.js";
import { createLogger } from "../lib/logger.js";

const AppConfigContext = createContext(null);
const AppRuntimeContext = createContext(null);
const logger = createLogger("AppServicesProvider");

const defaultConfig = {
  devMode: true,
  dbAvailable: false,
  multiplayerEnabled: false,
  dbStatusText: "Database unavailable"
};

export function AppServicesProvider({ children }) {
  const [appConfig, setAppConfig] = useState(defaultConfig);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const appConfigRef = useRef({ ...defaultConfig });
  const [sessionStore] = useState(() => createGameSessionStore());

  // One runtime store instance is shared by socket services, local game logic,
  // actions, and React subscribers.
  const [gameClient] = useState(() => createGameClient({ sessionStore }));
  const [localGame] = useState(() =>
    createLocalGameController({
      appConfig: appConfigRef.current,
      gameClient,
      sessionStore
    })
  );

  const refreshAppConfig = useCallback(async () => {
    try {
      const response = await fetch("/healthz", {
        headers: {
          Accept: "application/json"
        }
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load app config");
      }
      Object.assign(appConfigRef.current, payload);
      setAppConfig(current => ({ ...current, ...payload }));
      return payload;
    } catch (error) {
      logger.warn("Unable to refresh app config", {
        message: error?.message ?? "Unknown error"
      });
      Object.assign(appConfigRef.current, {
        dbAvailable: false,
        multiplayerEnabled: false,
        dbStatusText: error?.message || appConfigRef.current.dbStatusText
      });
      setAppConfig(current => ({
        ...current,
        dbAvailable: false,
        multiplayerEnabled: false,
        dbStatusText: error?.message || current.dbStatusText
      }));
      return null;
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAppConfig();
  }, [refreshAppConfig]);

  const configValue = useMemo(
    () => ({
      appConfig,
      isConfigLoading,
      refreshAppConfig
    }),
    [appConfig, isConfigLoading, refreshAppConfig]
  );

  const runtimeValue = useMemo(
    () => ({
      gameClient,
      sessionStore,
      localGame
    }),
    [gameClient, sessionStore, localGame]
  );

  return (
    <AppConfigContext.Provider value={configValue}>
      <AppRuntimeContext.Provider value={runtimeValue}>{children}</AppRuntimeContext.Provider>
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const value = useContext(AppConfigContext);
  if (!value) {
    throw new Error("useAppConfig must be used inside AppServicesProvider");
  }
  return value;
}

export function useGameServices() {
  const value = useContext(AppRuntimeContext);
  if (!value) {
    throw new Error("useGameServices must be used inside AppServicesProvider");
  }
  return value;
}

export function useAppServices() {
  return {
    ...useAppConfig(),
    ...useGameServices()
  };
}
