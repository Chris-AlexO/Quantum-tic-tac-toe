import C from "./constants.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("room-timers");

export function createRoomTimers(roomId) {
  const timeouts = {};
  const timeoutIntervals = {};
  const playerOfflineTimeout = {};

  let countdownTimeout = null;
  let countdownEndsAt = null;
  let disconnectState = null;

  return {
    get countdownEndsAt() {
      return countdownEndsAt;
    },

    hasCountdown() {
      return countdownTimeout != null;
    },

    beginCountdown(onComplete, delayMs = C.TIME.MATCH_START_DELAY_MS) {
      if (countdownTimeout) return false;

      countdownEndsAt = Date.now() + delayMs;
      countdownTimeout = setTimeout(() => {
        countdownTimeout = null;
        onComplete?.();
      }, delayMs);

      return true;
    },

    clearCountdown() {
      if (countdownTimeout) {
        clearTimeout(countdownTimeout);
        countdownTimeout = null;
      }
      countdownEndsAt = null;
    },

    getDisconnectState() {
      return disconnectState ? { ...disconnectState } : null;
    },

    setDisconnectState(mark, expiresAt) {
      disconnectState = { disconnectedMark: mark, expiresAt };
    },

    clearDisconnectState() {
      disconnectState = null;
    },

    isTimingOut(player) {
      return timeouts[player.playerId] != null;
    },

    startTimeout(player, callback) {
      if (timeouts[player.playerId] != null) return;

      timeouts[player.playerId] = setTimeout(() => {
        logger.info("Disconnect grace period expired", {
          roomId,
          playerId: player.playerId,
          playerName: player.getName()
        });
        callback();
      }, C.TIME.DISCONNECT_GRACE_MS);
    },

    startTimeoutInterval(player, callback) {
      if (timeoutIntervals[player.playerId] != null) return;
      timeoutIntervals[player.playerId] = setInterval(callback, C.TIME.TIMEOUT_WARNING_INTERVAL_MS);
    },

    startPlayerOfflineTimeout(player, callback) {
      if (playerOfflineTimeout[player.playerId]) return;
      playerOfflineTimeout[player.playerId] = setTimeout(callback, 5000);
    },

    endTimeout(player) {
      const id = player?.playerId;
      if (!id) return;

      clearTimeout(timeouts[id]);
      clearInterval(timeoutIntervals[id]);
      clearTimeout(playerOfflineTimeout[id]);

      delete timeouts[id];
      delete timeoutIntervals[id];
      delete playerOfflineTimeout[id];
      disconnectState = null;
    }
  };
}
