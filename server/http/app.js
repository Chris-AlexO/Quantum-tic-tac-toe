import path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createApp({
  getAppConfig,
  refreshAppConfig,
  listActiveGames,
  loadLocalGameSnapshot,
  saveLocalGameSnapshot,
  clearLocalGameSnapshot,
  getAdminOverview,
  getAdminRoom,
  getAdminPlayer,
  runRoomExpiryJob,
  clearAdminDatabase
} = {}) {
  const app = express();

 const publicDir = path.join(__dirname, "..", "..", "public");
  const serverDir = path.join(__dirname, "..", "server")

  app.use(express.json());
  app.use(express.static(publicDir));

  const getPlayerIdFromRequest = req =>
    String(
      req.get("x-player-id") ??
      req.query?.playerId ??
      req.body?.playerId ??
      ""
    ).trim() || null;

  app.get("/app-config.js", async (_req, res) => {
    await refreshAppConfig?.();
    res.type("application/javascript");
    res.send(`window.__QTTT_CONFIG__ = ${JSON.stringify(
      getAppConfig?.() ?? {
        devMode: process.env.NODE_ENV !== "production",
        dbAvailable: false,
        multiplayerEnabled: false,
        dbStatusText: "Database unavailable",
      }
    )};`);
  });

  // Health check
  app.get("/healthz", async (_req, res) => {
    await refreshAppConfig?.();
    res.status(200).json({
      ok: true,
      uptime: process.uptime(),
      ...(getAppConfig?.() ?? {})
    });
  });

  app.get("/api/active-games", async (_req, res) => {
    try {
      await refreshAppConfig?.();
      const result = await listActiveGames?.();
      const appConfig = getAppConfig?.() ?? {};
      if (result == null && appConfig.dbAvailable === false) {
        return res.status(503).json({
          ok: false,
          games: [],
          message: appConfig.dbStatusText || "Unable to load active games",
          ...appConfig
        });
      }

      res.status(200).json({
        ok: true,
        games: Array.isArray(result) ? result : [],
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        games: [],
        message: error?.message || "Unable to load active games",
        ...(getAppConfig?.() ?? {})
      });
    }
  });

  app.get("/api/local-game", async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig?.() ?? {};

    if (!appConfig.dbAvailable) {
      return res.status(503).json({
        ok: false,
        message: appConfig.dbStatusText || "PostgreSQL is offline.",
        ...appConfig
      });
    }

    const playerId = getPlayerIdFromRequest(req);
    if (!playerId) {
      return res.status(400).json({
        ok: false,
        message: "Player id is required.",
        ...appConfig
      });
    }

    try {
      const snapshot = await loadLocalGameSnapshot?.(playerId);
      res.status(200).json({
        ok: true,
        snapshot: snapshot ?? null,
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error?.message || "Unable to load the local game snapshot.",
        ...appConfig
      });
    }
  });

  app.put("/api/local-game", async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig?.() ?? {};

    if (!appConfig.dbAvailable) {
      return res.status(503).json({
        ok: false,
        message: appConfig.dbStatusText || "PostgreSQL is offline.",
        ...appConfig
      });
    }

    const playerId = getPlayerIdFromRequest(req);
    if (!playerId || !req.body?.snapshot) {
      return res.status(400).json({
        ok: false,
        message: "Player id and snapshot are required.",
        ...appConfig
      });
    }

    try {
      const result = await saveLocalGameSnapshot?.(playerId, {
        playerName: req.body?.playerName,
        snapshot: req.body?.snapshot
      });

      res.status(200).json({
        ok: true,
        result: result ?? { status: "ok" },
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error?.message || "Unable to persist the local game snapshot.",
        ...appConfig
      });
    }
  });

  app.delete("/api/local-game", async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig?.() ?? {};

    if (!appConfig.dbAvailable) {
      return res.status(200).json({
        ok: true,
        result: { status: "offline" },
        ...appConfig
      });
    }

    const playerId = getPlayerIdFromRequest(req);
    if (!playerId) {
      return res.status(400).json({
        ok: false,
        message: "Player id is required.",
        ...appConfig
      });
    }

    try {
      const result = await clearLocalGameSnapshot?.(playerId);
      res.status(200).json({
        ok: true,
        result: result ?? { status: "ok" },
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error?.message || "Unable to clear the local game snapshot.",
        ...appConfig
      });
    }
  });

  const requireDevAdmin = async (req, res) => {
    await refreshAppConfig?.();
    const appConfig = getAppConfig?.() ?? {};

    if (!appConfig.devMode) {
      res.status(403).json({
        ok: false,
        message: "Dev admin is only available outside production.",
        ...appConfig
      });
      return null;
    }

    if (!appConfig.dbAvailable) {
      res.status(503).json({
        ok: false,
        message: appConfig.dbStatusText || "PostgreSQL is offline.",
        ...appConfig
      });
      return null;
    }

    return appConfig;
  };

  app.get("/api/admin/db", async (_req, res) => {
    const appConfig = await requireDevAdmin(_req, res);
    if (!appConfig) return;

    try {
      const payload = await getAdminOverview?.();
      res.status(200).json({
        ok: true,
        ...(payload ?? { rooms: [], players: [] }),
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        rooms: [],
        players: [],
        message: error?.message || "Unable to load admin database overview.",
        ...appConfig
      });
    }
  });

  app.get("/api/admin/rooms/:roomId", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const room = await getAdminRoom?.(req.params.roomId);
      if (!room) {
        return res.status(404).json({
          ok: false,
          message: "Room not found.",
          ...appConfig
        });
      }

      res.status(200).json({
        ok: true,
        room,
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error?.message || "Unable to load room snapshot.",
        ...appConfig
      });
    }
  });

  app.get("/api/admin/players/:playerId", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const player = await getAdminPlayer?.(req.params.playerId);
      if (!player) {
        return res.status(404).json({
          ok: false,
          message: "Player not found.",
          ...appConfig
        });
      }

      res.status(200).json({
        ok: true,
        player,
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error?.message || "Unable to load player presence.",
        ...appConfig
      });
    }
  });

  app.post("/api/admin/db/expire", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const result = await runRoomExpiryJob?.();
      res.status(200).json({
        ok: true,
        result: result ?? { deletedRoomCount: 0, deletedRoomIds: [] },
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error?.message || "Unable to run the expiry job.",
        ...appConfig
      });
    }
  });

  app.post("/api/admin/db/clear", async (req, res) => {
    const appConfig = await requireDevAdmin(req, res);
    if (!appConfig) return;

    try {
      const result = await clearAdminDatabase?.();
      res.status(200).json({
        ok: true,
        result: result ?? { status: "ok" },
        ...appConfig
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        message: error?.message || "Unable to clear persisted database values.",
        ...appConfig
      });
    }
  });

  // SPA fallback (so refresh on /game/mp/:id works)
app.get("/*", (req, res) => {
    if (req.path.includes(".")) return res.sendStatus(404);
    res.sendFile(path.join(publicDir,  "index.html"));
  });

  return app;
}

export { createApp };
