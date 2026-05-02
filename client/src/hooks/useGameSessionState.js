import { useSyncExternalStore } from "react";
import { useGameServices } from "../providers/AppServicesProvider.jsx";

// React-only bridge into the imperative session store.
// Components should use this hook to read game state instead of calling
// sessionStore.getSnapshot() during render.
export function useGameSessionState() {
  const { sessionStore } = useGameServices();

  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getSnapshot
  );
}
