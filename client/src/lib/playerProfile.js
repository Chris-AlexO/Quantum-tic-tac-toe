import { getLocalValue, setLocalValue } from "./browserStorage.js";

const PLAYER_ID_KEY = "playerId";
const PLAYER_NAME_KEY = "playerName";
const RULESET_KEY = "preferredRuleset";

export function getOrMakePlayerId() {
  let playerId = getLocalValue(PLAYER_ID_KEY);
  if (!playerId) {
    playerId = crypto.randomUUID();
    setLocalValue(PLAYER_ID_KEY, playerId);
  }

  return playerId;
}

export function getSavedPlayerName() {
  return (getLocalValue(PLAYER_NAME_KEY) || "").trim();
}

export function setSavedPlayerName(name) {
  setLocalValue(PLAYER_NAME_KEY, name);
}

export function getPreferredRuleset() {
  return getLocalValue(RULESET_KEY) || "house";
}

export function setPreferredRuleset(ruleset) {
  setLocalValue(RULESET_KEY, ruleset);
}
