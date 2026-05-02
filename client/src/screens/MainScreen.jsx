import { useMainMenuState } from "../hooks/useMainMenuState.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, HeroCard } from "../components/ui/Card.jsx";

const RULESET_SUMMARIES = {
  house: [
    "Flexible cycle collapse",
    "Collapsed marks become X / O",
    "Simultaneous wins draw"
  ],
  goff: [
    "Original-style two-outcome collapse",
    "Collapsed marks keep move numbers",
    "Tie-break uses earliest completed line"
  ]
};

export function MainScreen() {
  const menu = useMainMenuState();
  const {
    appConfig,
    beginEditingName,
    feedback,
    handleNameBlur,
    handleNameSave,
    handleOpenQuickMatch,
    handleRulesetSelect,
    isConfigLoading,
    isEditingName,
    isMultiplayerReady,
    isSavingName,
    multiplayerHint,
    nameDraft,
    navigate,
    preferredRuleset,
    savedName,
    setNameDraft
  } = menu;
  const multiplayerStatus = isConfigLoading
    ? "Checking multiplayer"
    : appConfig.multiplayerEnabled
      ? "Multiplayer available"
      : "Multiplayer unavailable";
  const rulesetSummary = RULESET_SUMMARIES[preferredRuleset] ?? RULESET_SUMMARIES.house;

  return (
    <main className="app-shell">
      <HeroCard>
        <div className="app-title-row">
          <h1 className="app-title">Quantum Tic-Tac-Toe</h1>
          <span
            className={`app-service-dot ${appConfig.multiplayerEnabled ? "is-online" : "is-offline"}`}
            title={multiplayerStatus}
            aria-label={multiplayerStatus}
          />
        </div>
        <p className="app-subtitle">CA</p>
      </HeroCard>

      <section className="app-grid">
        <Card wide>
          <div className="app-ruleset-card">
            <div>
              <h2 className="app-card-title">Ruleset</h2>
              <div className="app-chip-row">
                <button
                  type="button"
                  className={`app-chip ${preferredRuleset === "house" ? "is-selected" : ""}`}
                  onClick={() => handleRulesetSelect("house")}
                >
                  House rules
                </button>
                <button
                  type="button"
                  className={`app-chip ${preferredRuleset === "goff" ? "is-selected" : ""}`}
                  onClick={() => handleRulesetSelect("goff")}
                >
                  Allan Goff
                </button>
              </div>
            </div>
            <ul className="app-ruleset-summary" aria-label="Selected ruleset summary">
              {rulesetSummary.map(rule => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </Card>

        <Card wide>
          {!isEditingName && savedName ? (
            <div className="app-name-summary">
              <div>
                <p className="app-name-summary-label">Welcome</p>
                <p className="app-name-summary-value">{savedName}</p>
              </div>
              <Button onClick={beginEditingName}>
                Edit name
              </Button>
            </div>
          ) : (
            <form className="app-form" onSubmit={handleNameSave}>
              <input
                type="text"
                className="app-input"
                placeholder="Enter your name"
                value={nameDraft}
                onChange={event => setNameDraft(event.target.value)}
                onBlur={handleNameBlur}
                disabled={isSavingName}
              />
              {isSavingName ? <span className="app-save-status">Saving...</span> : null}
            </form>
          )}

          <div className="app-action-stack">
            <Button onClick={() => navigate("/game/local")}>
              Local match
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenQuickMatch}
              disabled={!isMultiplayerReady}
              title={multiplayerHint}
            >
              Quick match
            </Button>
          </div>

          {feedback ? <p className="app-feedback">{feedback}</p> : null}
        </Card>

        <Card wide>
          <div className="app-action-stack app-action-stack-vertical">
            <Button
              onClick={() => navigate("/games/active")}
              disabled={!isMultiplayerReady}
              title={multiplayerHint}
            >
              Active games
            </Button>
            {appConfig.devMode ? (
              <Button onClick={() => navigate("/admin/dev-db")}>
                Open admin
              </Button>
            ) : null}
          </div>
        </Card>
      </section>
    </main>
  );
}
