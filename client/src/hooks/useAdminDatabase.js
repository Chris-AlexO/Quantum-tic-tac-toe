import { useEffect, useState } from "react";

import { useAppConfig, useGameServices } from "../providers/AppServicesProvider.jsx";

export function useAdminDatabase() {
  const { appConfig, refreshAppConfig } = useAppConfig();
  const { gameClient } = useGameServices();
  const [rooms, setRooms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [detailMessage, setDetailMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  useEffect(() => {
    void loadOverview();
  }, []);

  async function loadOverview() {
    setIsLoading(true);
    setStatusMessage("Loading");

    await refreshAppConfig();

    try {
      const payload = await gameClient.getAdminOverview();
      setRooms(payload?.rooms ?? []);
      setPlayers(payload?.players ?? []);
      setStatusMessage(
        `Loaded ${payload?.rooms?.length ?? 0} rooms and ${payload?.players?.length ?? 0} players`
      );

      if (selectedRoomId) {
        await inspectRoom(selectedRoomId);
      } else if (selectedPlayerId) {
        await inspectPlayer(selectedPlayerId);
      } else {
        setSelectedPayload(null);
        setDetailMessage("");
      }
    } catch (error) {
      setRooms([]);
      setPlayers([]);
      setSelectedPayload(null);
      setDetailMessage("");
      setStatusMessage(error?.message || "Unable to load admin data");
    } finally {
      setIsLoading(false);
    }
  }

  async function inspectRoom(roomId) {
    setDetailMessage(`Loading ${roomId}`);
    setSelectedPayload(null);

    try {
      const payload = await gameClient.getAdminRoom(roomId);
      setSelectedPayload(payload?.room ?? null);
      setDetailMessage("");
    } catch (error) {
      setSelectedPayload(null);
      setDetailMessage(error?.message || "Unable to inspect room");
    }
  }

  async function inspectPlayer(playerId) {
    setDetailMessage(`Loading ${playerId}`);
    setSelectedPayload(null);

    try {
      const payload = await gameClient.getAdminPlayer(playerId);
      setSelectedPayload(payload?.player ?? null);
      setDetailMessage("");
    } catch (error) {
      setSelectedPayload(null);
      setDetailMessage(error?.message || "Unable to inspect player");
    }
  }

  async function handleRunExpiry() {
    setMaintenanceMessage("Running expiry");

    try {
      const payload = await gameClient.runAdminExpiryJob();
      const deleted = payload?.result?.deletedRoomCount ?? 0;
      setMaintenanceMessage(
        deleted === 0
          ? "Expiry finished. No rooms removed."
          : `Expiry finished. Removed ${deleted} room${deleted === 1 ? "" : "s"}.`
      );
      await loadOverview();
    } catch (error) {
      setMaintenanceMessage(error?.message || "Unable to run expiry");
    }
  }

  function requestClearDatabase() {
    setIsClearConfirmOpen(true);
  }

  function cancelClearDatabase() {
    setIsClearConfirmOpen(false);
  }

  async function confirmClearDatabase() {
    setIsClearConfirmOpen(false);

    setMaintenanceMessage("Clearing database");

    try {
      await gameClient.clearAdminDatabase();
      setSelectedRoomId(null);
      setSelectedPlayerId(null);
      setSelectedPayload(null);
      setDetailMessage("");
      setMaintenanceMessage("Database cleared");
      await loadOverview();
    } catch (error) {
      setMaintenanceMessage(error?.message || "Unable to clear database");
    }
  }

  async function selectRoom(roomId) {
    setSelectedPlayerId(null);
    setSelectedRoomId(roomId);
    await inspectRoom(roomId);
  }

  async function selectPlayer(playerId) {
    setSelectedRoomId(null);
    setSelectedPlayerId(playerId);
    await inspectPlayer(playerId);
  }

  return {
    appConfig,
    cancelClearDatabase,
    confirmClearDatabase,
    detailMessage,
    handleRunExpiry,
    isClearConfirmOpen,
    inspectPlayer,
    inspectRoom,
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
  };
}
