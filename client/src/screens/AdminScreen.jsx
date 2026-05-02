import { useNavigate } from "react-router-dom";
import { formatExpiry, formatUpdatedAt, prettyJson } from "../lib/formatting.js";
import { useAdminDatabase } from "../hooks/useAdminDatabase.js";
import { Button } from "../components/ui/Button.jsx";
import { Card, HeroCard } from "../components/ui/Card.jsx";

export function AdminScreen() {
  const navigate = useNavigate();
  const admin = useAdminDatabase();
  const {
    appConfig,
    cancelClearDatabase,
    confirmClearDatabase,
    detailMessage,
    handleRunExpiry,
    isClearConfirmOpen,
    isLoading,
    loadOverview,
    maintenanceMessage,
    players,
    rooms,
    selectedPayload,
    selectedPlayerId,
    selectedRoomId,
    requestClearDatabase,
    selectPlayer,
    selectRoom,
    statusMessage
  } = admin;

  const renderInspector = () => {
    if (detailMessage) {
      return <p className="app-copy">{detailMessage}</p>;
    }

    if (!selectedPayload) {
      return <p className="app-copy">Select a room or player</p>;
    }

    if (selectedPayload.snapshot) {
      return (
        <>
          <div className="app-detail-grid">
            <div>
              <dt>Type</dt>
              <dd>{selectedPayload.id ? "Room snapshot" : "Snapshot"}</dd>
            </div>
            {selectedPayload.id ? (
              <div>
                <dt>Identifier</dt>
                <dd>{selectedPayload.id}</dd>
              </div>
            ) : null}
          </div>
          <pre className="app-code-block">{prettyJson(selectedPayload.snapshot)}</pre>
        </>
      );
    }

    return (
      <>
        <div className="app-detail-grid">
          {Object.entries(selectedPayload).map(([label, value]) => {
            if (label === "snapshot") {
              return null;
            }

            return (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value == null ? "-" : String(value)}</dd>
              </div>
            );
          })}
        </div>
        <pre className="app-code-block">{prettyJson(selectedPayload)}</pre>
      </>
    );
  };

  return (
    <main className="app-shell">
      <HeroCard>
        <h1 className="app-title">Database admin</h1>
        <p className="app-subtitle">{appConfig.dbStatusText}</p>
      </HeroCard>

      <section className="app-grid">
        <Card>
          <div className="app-section-head">
            <h2 className="app-card-title">Runtime</h2>
            <Button onClick={() => void loadOverview()}>
              Refresh
            </Button>
          </div>
          <p className={`app-status-pill ${appConfig.dbAvailable ? "is-live" : "is-offline"}`}>
            {appConfig.dbAvailable ? "PostgreSQL online" : "PostgreSQL offline"}
          </p>
          <p className="app-copy">{isLoading ? "Loading…" : statusMessage}</p>
        </Card>

        <Card>
          <h2 className="app-card-title">Maintenance</h2>
          <div className="app-action-stack app-action-stack-vertical">
            <Button variant="primary" onClick={handleRunExpiry}>
              Run expiry
            </Button>
            <Button onClick={requestClearDatabase}>
              Clear DB
            </Button>
          </div>
          {isClearConfirmOpen ? (
            <div className="app-confirm-panel" role="alertdialog" aria-labelledby="clear-db-title">
              <h3 id="clear-db-title">Clear persisted data?</h3>
              <div className="app-action-stack">
                <Button onClick={cancelClearDatabase}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void confirmClearDatabase()}>
                  Clear
                </Button>
              </div>
            </div>
          ) : null}
          {maintenanceMessage ? <p className="app-copy">{maintenanceMessage}</p> : null}
        </Card>

        <Card wide>
          <h2 className="app-card-title">Rooms</h2>
          {!rooms.length ? (
            <p className="app-copy">No room records</p>
          ) : (
            <div className="app-stack-list">
              {rooms.map(room => (
                <button
                  key={room.id}
                  type="button"
                  className={`app-list-button ${selectedRoomId === room.id ? "is-selected" : ""}`}
                  onClick={() => {
                    void selectRoom(room.id);
                  }}
                >
                  <strong>{room.id}</strong>
                  <span>
                    {room.roomType} • {room.ruleset === "goff" ? "goff" : "house"} • {room.status} • {formatUpdatedAt(room.updatedAt)}
                  </span>
                  <span>
                    Turn {room.currentTurn || "-"} • Next {room.nextAction || "-"} • Expires {formatExpiry(room.expiresAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card wide>
          <h2 className="app-card-title">Players</h2>
          {!players.length ? (
            <p className="app-copy">No player records</p>
          ) : (
            <div className="app-stack-list">
              {players.map(player => (
                <button
                  key={player.id}
                  type="button"
                  className={`app-list-button ${selectedPlayerId === player.id ? "is-selected" : ""}`}
                  onClick={() => {
                    void selectPlayer(player.id);
                  }}
                >
                  <strong>{player.displayName || player.id}</strong>
                  <span>
                    {player.id} • {player.connectionStatus} • {formatUpdatedAt(player.updatedAt)}
                  </span>
                  <span>
                    Room {player.activeRoomId || "-"} • Role {player.activeRole || "-"} • Mark {player.activeMark || "-"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card wide>
          <div className="app-section-head">
            <h2 className="app-card-title">Inspector</h2>
            <Button onClick={() => navigate("/")}>
              Back
            </Button>
          </div>
          {renderInspector()}
        </Card>
      </section>
    </main>
  );
}
