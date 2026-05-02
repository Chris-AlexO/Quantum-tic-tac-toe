export function getFallbackAppConfig() {
  return {
    devMode: process.env.NODE_ENV !== "production",
    dbAvailable: false,
    multiplayerEnabled: false,
    dbStatusText: "Database unavailable"
  };
}

export function getAppConfig(getAppConfig) {
  return getAppConfig?.() ?? getFallbackAppConfig();
}

export function sendOk(res, payload = {}, appConfig = {}) {
  return res.status(200).json({
    ok: true,
    ...payload,
    ...appConfig
  });
}

export function sendError(res, status, message, payload = {}, appConfig = {}) {
  return res.status(status).json({
    ok: false,
    ...payload,
    message,
    ...appConfig
  });
}

export function getPlayerIdFromRequest(req) {
  return String(
    req.get("x-player-id") ??
    req.query?.playerId ??
    req.body?.playerId ??
    ""
  ).trim() || null;
}
