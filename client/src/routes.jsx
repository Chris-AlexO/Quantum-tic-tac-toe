import { Navigate, Route, Routes } from "react-router-dom";
import { MainScreen } from "./screens/MainScreen.jsx";
import { MatchmakingScreen } from "./screens/MatchmakingScreen.jsx";
import { GameScreen } from "./screens/GameScreen.jsx";
import { ActiveGamesScreen } from "./screens/ActiveGamesScreen.jsx";
import { AdminScreen } from "./screens/AdminScreen.jsx";
import { RequireRoute } from "./components/routes/RequireRoute.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainScreen />} />
      <Route
        path="/matchmaking"
        element={
          <RequireRoute multiplayer>
            <MatchmakingScreen />
          </RequireRoute>
        }
      />
      <Route path="/game/local" element={<GameScreen local />} />
      <Route
        path="/game/mp/:roomId"
        element={
          <RequireRoute multiplayer>
            <GameScreen />
          </RequireRoute>
        }
      />
      <Route
        path="/games/active"
        element={
          <RequireRoute multiplayer>
            <ActiveGamesScreen />
          </RequireRoute>
        }
      />
      <Route
        path="/admin/dev-db"
        element={
          <RequireRoute dev>
            <AdminScreen />
          </RequireRoute>
        }
      />
      <Route path="/games/*" element={<Navigate to="/" replace />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
