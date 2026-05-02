import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatUpdatedAt } from "../lib/formatting.js";
import { useGameActions } from "../hooks/game/useGameActions.js";
import { useAppConfig, useGameServices } from "../providers/AppServicesProvider.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card, HeroCard } from "../components/ui/Card.jsx";
import { GAME_ACTIONS } from "../../../shared/game/actions.js";

export function ActiveGamesScreen() {
  const navigate = useNavigate();
  const { appConfig, refreshAppConfig } = useAppConfig();
  const { gameClient } = useGameServices();
  const { action } = useGameActions();
  const [games, setGames] = useState([]);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    await refreshAppConfig();

    try {
      const payload = await gameClient.listActiveGames();
      setGames(payload?.games ?? []);
      setMessage(payload?.message ?? "");
    } catch (error) {
      setGames([]);
      setLoadError(error?.message || "Unable to load active games");
    } finally {
      setIsLoading(false);
    }
  }, [gameClient, refreshAppConfig]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  async function handleJoinRoom(event) {
    event.preventDefault();

    const roomId = joinRoomId.trim();
    if (!roomId) {
      setJoinError("Enter a room id");
      return;
    }

    setJoinError("");

    try {
      const ack = await gameClient.getState(roomId);
      if (ack?.status !== "ok") {
        throw new Error("Room not found");
      }
      await action?.handleButtonAction({ type: GAME_ACTIONS.JOIN_MATCH, roomId });
    } catch {
      setJoinError("Room not found");
    }
  }

  return (
    <main className="app-shell">
      <HeroCard>
        <h1 className="app-title">Active games</h1>
        <p className="app-subtitle">{appConfig.dbStatusText}</p>
      </HeroCard>

      <section className="app-grid">
        <Card wide>
          <h2 className="app-card-title">Join room</h2>
          <form className="app-form" onSubmit={handleJoinRoom}>
            <input
              type="text"
              className="app-input"
              placeholder="Enter room id"
              value={joinRoomId}
              onChange={event => setJoinRoomId(event.target.value)}
            />
            <Button type="submit" variant="primary">
              Open room
            </Button>
          </form>
          {joinError ? <p className="app-feedback">{joinError}</p> : null}
        </Card>

        <Card wide>
          <div className="app-section-head">
            <h2 className="app-card-title">Room list</h2>
            <div className="app-action-stack">
              <Button onClick={() => void loadGames()}>
                Refresh
              </Button>
              <Button onClick={() => navigate("/")}>
                Back
              </Button>
            </div>
          </div>

          {isLoading ? <p className="app-copy">Loading…</p> : null}
          {!isLoading && loadError ? <p className="app-feedback">{loadError}</p> : null}
          {!isLoading && !loadError && !games.length ? (
            <p className="app-copy">{message || "No active rooms"}</p>
          ) : null}

          {!isLoading && !loadError && games.length ? (
            <div className="app-stack-list">
              {games.map(game => {
                const snapshot = game.snapshot ?? {};
                const players = snapshot.players ?? {};
                const isWaiting = game.status === "waiting";

                return (
                  <article key={game.id} className="app-list-card">
                    <div className="app-list-card-row">
                      <span className={`app-status-pill is-${isWaiting ? "waiting" : "live"}`}>
                        {(game.status || "unknown").toUpperCase()}
                      </span>
                      <strong>{game.id}</strong>
                    </div>
                    <p className="app-copy">
                      {players.X?.name || "Player X"} vs {players.O?.name || "Waiting..."}
                    </p>
                    <p className="app-copy">
                      {game.ruleset === "goff" ? "Allan Goff" : "House"} • {formatUpdatedAt(game.updatedAt)}
                    </p>
                    <div className="app-action-stack">
                      <Button
                        variant="primary"
                        onClick={() =>
                          action?.handleButtonAction({ type: GAME_ACTIONS.JOIN_MATCH, roomId: game.id })
                        }
                      >
                        {isWaiting ? "Open room" : "Spectate"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </Card>
      </section>
    </main>
  );
}
