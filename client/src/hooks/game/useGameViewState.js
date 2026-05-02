import { useEffect, useMemo, useState } from "react";
import { selectGameViewModel } from "../../view-models/game/gameViewModel.js";
import { useGameSessionState } from "../useGameSessionState.js";

export function useGameViewState({ local = false }) {
  const state = useGameSessionState();
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [lastSummaryKey, setLastSummaryKey] = useState(null);
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);

  const { viewState, roomContext } = useMemo(
    () => selectGameViewModel(state, {
      local,
      summaryDismissed,
      lastSummaryKey,
      leavePromptOpen
    }),
    [state, local, summaryDismissed, lastSummaryKey, leavePromptOpen]
  );

  useEffect(() => {
    if (viewState.summary.shouldResetDismissed) {
      setSummaryDismissed(false);
    }

    if (viewState.summary.summaryKey !== lastSummaryKey) {
      setLastSummaryKey(viewState.summary.summaryKey);
    }
  }, [lastSummaryKey, viewState.summary]);

  return {
    state,
    viewState,
    roomContext,
    setSummaryDismissed,
    setLeavePromptOpen
  };
}
