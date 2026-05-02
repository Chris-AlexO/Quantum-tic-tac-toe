import { useNavigate } from "react-router-dom";
import { useAppConfig, useGameServices } from "../providers/AppServicesProvider.jsx";
import { getPreferredRuleset, getSavedPlayerName } from "../lib/playerProfile.js";
import { Button, ButtonLink } from "../components/ui/Button.jsx";
import { Card, HeroCard } from "../components/ui/Card.jsx";
import { useMatchmakingFlow } from "../hooks/useMatchmakingFlow.js";

const MATCHMAKING_COPY = {
  searching: {
    title: "Searching for a match",
    body: "Waiting for another player to join.",
    label: "Waiting for opponent"
  },
  found: {
    title: "Game found",
    body: "Opponent located. Joining now.",
    label: "Opponent found"
  },
  error: {
    title: "Search unavailable",
    body: "Unable to complete search",
    label: "Unable to complete search"
  }
};

export function MatchmakingScreen() {
  const { appConfig, isConfigLoading } = useAppConfig();
  const { gameClient } = useGameServices();
  const navigate = useNavigate();
  const savedName = getSavedPlayerName();
  const ruleset = getPreferredRuleset();
  const { cancelSearch, errorMessage, phase } = useMatchmakingFlow({
    appConfig,
    gameClient,
    isConfigLoading,
    navigate,
    ruleset,
    savedName
  });
  const copy = MATCHMAKING_COPY[phase] ?? MATCHMAKING_COPY.searching;

  return (
    <main className="app-shell">
      <HeroCard accent className={`app-matchmaking-card is-${phase}`}>
        <p className="app-eyebrow">Multiplayer</p>
        <h1 className="app-title">{copy.title}</h1>
        <p className="app-subtitle">{errorMessage || copy.body}</p>
        <div className={`app-matchmaking-stage is-${phase}`}>
          <div className="app-matchmaking-orb" />
          <p className="app-matchmaking-label">{copy.label}</p>
        </div>
      </HeroCard>

      <section className="app-grid">
        <Card>
          <h2 className="app-card-title">Matchmaking</h2>
          <dl className="app-key-values">
            <div>
              <dt>Player</dt>
              <dd>{savedName}</dd>
            </div>
            <div>
              <dt>Ruleset</dt>
              <dd>{ruleset === "goff" ? "Allan Goff" : "House rules"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{copy.label}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="app-card-title">Backend</h2>
          <p className="app-copy">
            {isConfigLoading ? "Checking" : appConfig.dbStatusText}
          </p>
          {errorMessage ? <p className="app-feedback">{errorMessage}</p> : null}
        </Card>

        <Card wide>
          <div className="app-action-stack">
            <Button onClick={cancelSearch}>
              Cancel search
            </Button>
            <ButtonLink to="/">
              Back
            </ButtonLink>
          </div>
        </Card>
      </section>
    </main>
  );
}
