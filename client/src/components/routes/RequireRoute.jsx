import { Navigate } from "react-router-dom";
import { getSavedPlayerName } from "../../lib/playerProfile.js";
import { useAppConfig } from "../../providers/AppServicesProvider.jsx";

export function RequireRoute({ children, dev = false, multiplayer = false }) {
  const { appConfig, isConfigLoading } = useAppConfig();

  if (isConfigLoading) {
    return null;
  }

  if (dev && !appConfig.devMode) {
    return <Navigate to="/" replace />;
  }

  if (multiplayer && (!appConfig.multiplayerEnabled || !getSavedPlayerName())) {
    return <Navigate to="/" replace />;
  }

  return children;
}

