import assert from "node:assert/strict";
import test from "node:test";

test("browser storage helper falls back when storage globals are unavailable", async () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;

  try {
    const { getLocalValue, setLocalValue, removeSessionValue } = await import("../client/src/lib/browserStorage.js");

    setLocalValue("phase-six-key", "saved");

    assert.equal(getLocalValue("phase-six-key"), "saved");
    assert.doesNotThrow(() => removeSessionValue("roomId"));
  } finally {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    }
    if (originalSessionStorage) {
      globalThis.sessionStorage = originalSessionStorage;
    }
  }
});
