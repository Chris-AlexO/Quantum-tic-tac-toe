import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getPreferredRuleset,
  getSavedPlayerName,
  setPreferredRuleset,
  setSavedPlayerName
} from "../lib/playerProfile.js";
import { validatePlayerName } from "../lib/playerNameValidation.js";
import { useAppConfig, useGameServices } from "../providers/AppServicesProvider.jsx";

export function useMainMenuState() {
  const { appConfig, isConfigLoading } = useAppConfig();
  const { gameClient } = useGameServices();
  const navigate = useNavigate();
  const [savedName, setSavedNameState] = useState(getSavedPlayerName());
  const [nameDraft, setNameDraft] = useState(getSavedPlayerName());
  const [preferredRuleset, setPreferredRulesetState] = useState(getPreferredRuleset());
  const [isEditingName, setIsEditingName] = useState(!getSavedPlayerName());
  const [isSavingName, setIsSavingName] = useState(false);
  const [feedback, setFeedback] = useState("");
  const saveNamePromiseRef = useRef(null);

  const isMultiplayerReady = useMemo(
    () => Boolean(appConfig.multiplayerEnabled && savedName),
    [appConfig.multiplayerEnabled, savedName]
  );

  const multiplayerHint = !appConfig.multiplayerEnabled
    ? appConfig.dbStatusText
    : !savedName
      ? "Name required"
      : "";

  function handleRulesetSelect(ruleset) {
    setPreferredRuleset(ruleset);
    setPreferredRulesetState(ruleset);
  }

  async function saveNameDraft() {
    if (saveNamePromiseRef.current) return saveNamePromiseRef.current;
    if (isSavingName) return Boolean(savedName);

    saveNamePromiseRef.current = commitNameDraft();
    try {
      return await saveNamePromiseRef.current;
    } finally {
      saveNamePromiseRef.current = null;
    }
  }

  async function commitNameDraft() {
    const result = validatePlayerName(nameDraft);
    if (!result.ok) {
      setFeedback(result.message);
      return false;
    }

    if (result.name === savedName) {
      setIsEditingName(false);
      setFeedback("");
      return true;
    }

    const previousName = savedName;
    setIsSavingName(true);
    setFeedback("");
    setSavedPlayerName(result.name);
    setSavedNameState(result.name);

    try {
      const ack = await gameClient.sendPlayerName(result.name);
      if (!ack) {
        throw new Error("Unable to save name");
      }
      setIsEditingName(false);
      return true;
    } catch (error) {
      setSavedPlayerName(previousName);
      setSavedNameState(previousName);
      setFeedback(error?.message || "Unable to save name");
      return false;
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleNameSave(event) {
    event.preventDefault();
    await saveNameDraft();
  }

  async function handleNameBlur() {
    if (!isEditingName || !nameDraft.trim()) return;
    await saveNameDraft();
  }

  async function handleOpenQuickMatch() {
    const hasName = isEditingName ? await saveNameDraft() : Boolean(savedName);
    if (!hasName) return;
    if (!appConfig.multiplayerEnabled) {
      setFeedback(multiplayerHint || "Multiplayer unavailable");
      return;
    }

    navigate("/matchmaking");
  }

  function beginEditingName() {
    setNameDraft(savedName);
    setIsEditingName(true);
    setFeedback("");
  }

  return {
    appConfig,
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
    setNameDraft,
    beginEditingName
  };
}
