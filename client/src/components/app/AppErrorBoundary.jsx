import React from "react";
import { createLogger } from "../../lib/logger.js";
import { Button } from "../ui/Button.jsx";
import { HeroCard } from "../ui/Card.jsx";

const logger = createLogger("AppErrorBoundary");

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("Unhandled render error", {
      message: error?.message ?? "Unknown error",
      stack: error?.stack ?? null,
      componentStack: errorInfo?.componentStack ?? null
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-shell">
        <HeroCard className="error-boundary-card">
          <p className="app-eyebrow">App error</p>
          <h1 className="app-title error-boundary-title">Something broke</h1>
          <p className="app-subtitle">Refresh the page or head back to the main menu.</p>
          <div className="app-action-stack">
            <Button variant="primary" onClick={this.handleReload}>
              Reload
            </Button>
            <Button onClick={this.handleGoHome}>
              Main menu
            </Button>
          </div>
        </HeroCard>
      </main>
    );
  }
}
