import test from "node:test";
import assert from "node:assert/strict";

test("game session store notifies subscribers and patches state", async () => {
  const { createGameSessionStore } = await import("../client/src/game/sessionStore.js");
  const store = createGameSessionStore();
  let calls = 0;

  const unsubscribe = store.subscribe(() => {
    calls += 1;
  });

  store.patch(snapshot => ({
    ...snapshot,
    ui: {
      ...snapshot.ui,
      toastMessage: "Saved"
    }
  }));

  assert.equal(store.getToastMessage(), "Saved");
  assert.equal(calls, 1);

  unsubscribe();
  store.setToastMessage("Ignored");
  assert.equal(calls, 1);
});
