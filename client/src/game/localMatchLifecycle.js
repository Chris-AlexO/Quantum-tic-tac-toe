import { getPreferredRuleset } from "../lib/playerProfile.js";
import { MATCH_START_DELAY_MS } from "../../../shared/game/localGameDomain.js";
import { buildLocalState } from "./localGameState.js";

export function createLocalMatchLifecycle({
  persistence,
  runtime,
  sessionStore,
  timer
}) {
  async function persistCurrentState(sourceState = sessionStore.getSnapshot()) {
    return persistence.persist(sourceState, runtime);
  }

  async function clearPersistedState() {
    return persistence.clear();
  }

  function publish(nextState) {
    sessionStore.setSnapshot({
      ...nextState,
      timeInterval: sessionStore.getSnapshot().timeInterval
    });

    if (nextState.session.status === "playing") {
      timer.ensureTimer();
    } else {
      timer.clearTimer();
    }

    void persistCurrentState(sessionStore.getSnapshot());
  }

  function startMatch() {
    runtime.reset();
    persistence.resetCache();
    runtime.clearStartTimeout();
    timer.clearTimer();

    const currentState = sessionStore.getSnapshot();
    const ruleset =
      currentState.session.type === "local"
        ? currentState.session.ruleset ?? getPreferredRuleset()
        : getPreferredRuleset();
    const nextState = buildLocalState(currentState, ruleset);
    sessionStore.setSnapshot(nextState);
    void persistCurrentState(nextState);
  }

  async function hydrateOrStart() {
    if (persistence.canPersist()) {
      try {
        const payload = await persistence.load();
        if (payload?.snapshot && applyRestoredState(payload.snapshot)) {
          return "restored";
        }
      } catch {
        // Fall through to a fresh local game when persistence is unavailable.
      }
    }

    startMatch();
    return "new";
  }

  function stop({ clearPersisted = false } = {}) {
    runtime.clearStartTimeout();
    timer.clearTimer();
    if (clearPersisted) {
      runtime.reset();
      void clearPersistedState();
    }
  }

  function applyRestoredState(snapshot) {
    const restoredState = snapshot?.state;
    if (!restoredState?.session || restoredState.session.type !== "local") {
      return false;
    }

    runtime.restore(persistence.readRuntimeSnapshot(snapshot));
    runtime.clearStartTimeout();
    timer.clearTimer();

    sessionStore.setSnapshot({
      ...sessionStore.getSnapshot(),
      ...restoredState,
      session: {
        ...restoredState.session,
        type: "local"
      },
      ui: {
        ...sessionStore.getSnapshot().ui,
        historyIndex: null,
        toastMessage: null,
        modalMessage: null,
        rematchPrompt: null
      },
      timeInterval: null
    });

    resumeRestoredRuntime();
    return true;
  }

  function resumeRestoredRuntime() {
    const liveState = sessionStore.getSnapshot();
    if (liveState.session.status === "starting") {
      const remainingCountdown = Math.max(
        0,
        (liveState.session.countdownEndsAt ?? Date.now()) - Date.now()
      );

      if (remainingCountdown === 0) {
        startPlaying();
        return;
      }

      runtime.startTimeout = setTimeout(startPlaying, remainingCountdown);
      return;
    }

    if (liveState.session.status === "playing") {
      timer.ensureTimer();
    }
  }

  function startCountdown({ skip = false } = {}) {
    const liveState = sessionStore.getSnapshot();
    if (liveState.session.type !== "local") {
      return;
    }

    runtime.clearStartTimeout();

    if (skip) {
      startPlaying();
      return;
    }

    sessionStore.patch(state => ({
      ...state,
      session: {
        ...state.session,
        status: "starting",
        countdownEndsAt: Date.now() + MATCH_START_DELAY_MS
      }
    }));

    runtime.startTimeout = setTimeout(startPlaying, MATCH_START_DELAY_MS);
    void persistCurrentState(sessionStore.getSnapshot());
  }

  function startPlaying() {
    runtime.startTimeout = null;
    const liveState = sessionStore.getSnapshot();
    if (liveState.session.type !== "local") {
      return;
    }

    sessionStore.patch(state => ({
      ...state,
      session: {
        ...state.session,
        status: "playing",
        countdownEndsAt: null
      }
    }));
    timer.ensureTimer();
    void persistCurrentState(sessionStore.getSnapshot());
  }

  return {
    hydrateOrStart,
    publish,
    startCountdown,
    startMatch,
    stop
  };
}
