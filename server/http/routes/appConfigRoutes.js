import { getAppConfig, getFallbackAppConfig } from "../responses.js";

export function registerAppConfigRoutes(app, { refreshAppConfig, readAppConfig } = {}) {
  app.get("/app-config.js", async (_req, res) => {
    await refreshAppConfig?.();
    res.type("application/javascript");
    res.send(`window.__QTTT_CONFIG__ = ${JSON.stringify(readAppConfig?.() ?? getFallbackAppConfig())};`);
  });

  app.get("/healthz", async (_req, res) => {
    await refreshAppConfig?.();
    res.status(200).json({
      ok: true,
      uptime: process.uptime(),
      ...getAppConfig(readAppConfig)
    });
  });
}
