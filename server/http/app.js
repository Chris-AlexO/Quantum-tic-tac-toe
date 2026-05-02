import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";

import { registerActiveGamesRoutes } from "./routes/activeGamesRoutes.js";
import { registerAdminRoutes } from "./routes/adminRoutes.js";
import { registerAppConfigRoutes } from "./routes/appConfigRoutes.js";
import { registerLocalGameRoutes } from "./routes/localGameRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createApp(dependencies = {}) {
  const app = express();
  const {
    getAppConfig: readAppConfig,
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
  } = dependencies;

  const publicDir = path.join(__dirname, "..", "..", "public");
  const clientDistDir = path.join(__dirname, "..", "..", "dist", "client");
  const clientIndexPath = path.join(clientDistDir, "index.html");
  const sharedDir = path.join(__dirname, "..", "..", "shared");
  const hasClientBuild = fs.existsSync(clientIndexPath);
  const spaIndexPath = hasClientBuild ? clientIndexPath : path.join(publicDir, "index.html");
  const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL;

  app.use(express.json());
  if (hasClientBuild) {
    app.use(express.static(clientDistDir));
  }
  app.use(express.static(publicDir));
  app.use("/shared", express.static(sharedDir));

  registerAppConfigRoutes(app, { refreshAppConfig, readAppConfig });
  registerActiveGamesRoutes(app, { refreshAppConfig, readAppConfig, listActiveGames });
  registerLocalGameRoutes(app, {
    refreshAppConfig,
    readAppConfig,
    loadLocalGameSnapshot,
    saveLocalGameSnapshot,
    clearLocalGameSnapshot
  });
  registerAdminRoutes(app, {
    refreshAppConfig,
    readAppConfig,
    getAdminOverview,
    getAdminRoom,
    getAdminPlayer,
    runRoomExpiryJob,
    clearAdminDatabase
  });

  app.get("/legacy", (_req, res) => {
    res.redirect(302, "/");
  });

  app.get("/legacy/*", (_req, res) => {
    res.redirect(302, "/");
  });

  app.get("/*", (req, res) => {
    if (req.path.includes(".")) return res.sendStatus(404);
    if (viteDevServerUrl) {
      return res.redirect(302, `${viteDevServerUrl}${req.originalUrl}`);
    }
    res.sendFile(spaIndexPath);
  });

  return app;
}

export { createApp };
