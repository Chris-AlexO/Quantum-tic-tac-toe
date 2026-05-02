import { getAppConfig, sendError, sendOk } from "../responses.js";

export function registerAdminRoutes(app, {
  refreshAppConfig,
  readAppConfig,
  getAdminOverview,
  getAdminRoom,
  getAdminPlayer,
  runRoomExpiryJob,
  clearAdminDatabase
} = {}) {
  const requireDevAdmin = async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig(readAppConfig);

    if (!appConfig.devMode) {
      sendError(res, 403, "Dev admin is only available outside production.", {}, appConfig);
      return null;
    }

    if (!appConfig.dbAvailable) {
      sendError(res, 503, appConfig.dbStatusText || "PostgreSQL is offline.", {}, appConfig);
      return null;
    }

    return appConfig;
  };

  app.get("/api/admin/db", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const overview = await getAdminOverview?.();
      return sendOk(res, overview ?? { rooms: [], players: [] }, appConfig);
    } catch (error) {
      return sendError(
        res,
        503,
        error?.message || "Unable to load admin database overview.",
        { rooms: [], players: [] },
        appConfig
      );
    }
  });

  app.get("/api/admin/rooms/:roomId", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const room = await getAdminRoom?.(req.params.roomId);
      return room
        ? sendOk(res, { room }, appConfig)
        : sendError(res, 404, "Room not found.", {}, appConfig);
    } catch (error) {
      return sendError(res, 503, error?.message || "Unable to load room snapshot.", {}, appConfig);
    }
  });

  app.get("/api/admin/players/:playerId", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const player = await getAdminPlayer?.(req.params.playerId);
      return player
        ? sendOk(res, { player }, appConfig)
        : sendError(res, 404, "Player not found.", {}, appConfig);
    } catch (error) {
      return sendError(res, 503, error?.message || "Unable to load player presence.", {}, appConfig);
    }
  });

  app.post("/api/admin/db/expire", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const result = await runRoomExpiryJob?.();
      return sendOk(res, { result: result ?? { deletedRoomCount: 0, deletedRoomIds: [] } }, appConfig);
    } catch (error) {
      return sendError(res, 503, error?.message || "Unable to run the expiry job.", {}, appConfig);
    }
  });

  app.post("/api/admin/db/clear", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const result = await clearAdminDatabase?.();
      return sendOk(res, { result: result ?? { status: "ok" } }, appConfig);
    } catch (error) {
      return sendError(
        res,
        503,
        error?.message || "Unable to clear persisted database values.",
        {},
        appConfig
      );
    }
  });
}
