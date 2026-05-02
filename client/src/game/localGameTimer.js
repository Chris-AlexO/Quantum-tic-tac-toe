export function createLocalGameTimer({ getSnapshot, patchSnapshot, clearStoredTimer }) {
  function clearTimer() {
    clearStoredTimer();
  }

  function finishOnTimeLoss(expiredMark) {
    const winner = expiredMark === "X" ? "O" : "X";

    patchSnapshot(state => ({
      ...state,
      session: {
        ...state.session,
        status: "finished"
      },
      game: {
        ...state.game,
        winner,
        nextAction: "winner",
        cyclePath: null
      },
      timeInterval: null
    }));

    clearTimer();
  }

  function ensureTimer() {
    clearTimer();

    const timerId = setInterval(() => {
      const liveState = getSnapshot();
      if (liveState.session.type !== "local" || liveState.session.status !== "playing") {
        clearTimer();
        return;
      }

      const targetKey = liveState.game.turn === "X" ? "me" : "opponent";
      const currentTime = liveState.players[targetKey].time;
      const nextTime = Math.max(0, currentTime - 1);

      patchSnapshot(state => ({
        ...state,
        players: {
          ...state.players,
          [targetKey]: {
            ...state.players[targetKey],
            time: nextTime
          }
        },
        timeInterval: timerId
      }));

      if (nextTime === 0) {
        finishOnTimeLoss(liveState.game.turn);
      }
    }, 1000);

    patchSnapshot(state => ({
      ...state,
      timeInterval: timerId
    }));
  }

  return {
    clearTimer,
    ensureTimer
  };
}
