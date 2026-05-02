import {
  getAppConfig,
  getPlayerIdFromRequest,
  sendError,
  sendOk
} from "../responses.js";

export function registerLocalGameRoutes(app, {
  refreshAppConfig,
  readAppConfig,
  loadLocalGameSnapshot,
  saveLocalGameSnapshot,
  clearLocalGameSnapshot
} = {}) {
  app.get("/api/local-game", async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig(readAppConfig);

    if (!appConfig.dbAvailable) {
      return sendError(res, 503, appConfig.dbStatusText || "PostgreSQL is offline.", {}, appConfig);
    }

    const playerId = getPlayerIdFromRequest(req);
    if (!playerId) {
      return sendError(res, 400, "Player id is required.", {}, appConfig);
    }

    try {
      const snapshot = await loadLocalGameSnapshot?.(playerId);
      return sendOk(res, { snapshot: snapshot ?? null }, appConfig);
    } catch (error) {
      return sendError(
        res,
        503,
        error?.message || "Unable to load the local game snapshot.",
        {},
        appConfig
      );
    }
  });

  app.put("/api/local-game", async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig(readAppConfig);

    if (!appConfig.dbAvailable) {
      return sendError(res, 503, appConfig.dbStatusText || "PostgreSQL is offline.", {}, appConfig);
    }

    const playerId = getPlayerIdFromRequest(req);
    if (!playerId || !req.body?.snapshot) {
      return sendError(res, 400, "Player id and snapshot are required.", {}, appConfig);
    }

    try {
      const result = await saveLocalGameSnapshot?.(playerId, {
        playerName: req.body?.playerName,
        snapshot: req.body?.snapshot
      });
      return sendOk(res, { result: result ?? { status: "ok" } }, appConfig);
    } catch (error) {
      return sendError(
        res,
        503,
        error?.message || "Unable to persist the local game snapshot.",
        {},
        appConfig
      );
    }
  });

  app.delete("/api/local-game", async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig(readAppConfig);

    if (!appConfig.dbAvailable) {
      return sendOk(res, { result: { status: "offline" } }, appConfig);
    }

    const playerId = getPlayerIdFromRequest(req);
    if (!playerId) {
      return sendError(res, 400, "Player id is required.", {}, appConfig);
    }

    try {
      const result = await clearLocalGameSnapshot?.(playerId);
      return sendOk(res, { result: result ?? { status: "ok" } }, appConfig);
    } catch (error) {
      return sendError(
        res,
        503,
        error?.message || "Unable to clear the local game snapshot.",
        {},
        appConfig
      );
    }
  });
}
