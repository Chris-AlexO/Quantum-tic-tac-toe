import { getAppConfig, sendError, sendOk } from "../responses.js";

export function registerActiveGamesRoutes(app, {
  refreshAppConfig,
  readAppConfig,
  listActiveGames
} = {}) {
  app.get("/api/active-games", async (_req, res) => {
    try {
      await refreshAppConfig?.();
      const result = await listActiveGames?.();
      const appConfig = getAppConfig(readAppConfig);

      if (result == null && appConfig.dbAvailable === false) {
        return sendError(
          res,
          503,
          appConfig.dbStatusText || "Unable to load active games",
          { games: [] },
          appConfig
        );
      }

      return sendOk(res, { games: Array.isArray(result) ? result : [] }, appConfig);
    } catch (error) {
      return sendError(
        res,
        503,
        error?.message || "Unable to load active games",
        { games: [] },
        getAppConfig(readAppConfig)
      );
    }
  });
}
