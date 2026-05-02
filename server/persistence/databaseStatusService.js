export function createDatabaseStatusService({
  repository,
  devMode = process.env.NODE_ENV !== "production",
  refreshIntervalMs = 10000
} = {}) {
  const status = {
    available: false,
    message: "Database unavailable",
    checkedAt: null
  };
  let interval = null;

  function markUnavailable(error) {
    status.available = false;
    status.message = error?.message || "Unable to reach PostgreSQL";
    status.checkedAt = new Date().toISOString();
  }

  if (typeof repository?.setConnectionErrorHandler === "function") {
    repository.setConnectionErrorHandler(markUnavailable);
  }

  async function refresh() {
    try {
      if (typeof repository?.ping !== "function") {
        status.available = false;
        status.message = "Database integration disabled";
        return getAppConfig();
      }

      await repository.ping();
      status.available = true;
      status.message = "PostgreSQL online";
      return getAppConfig();
    } catch (error) {
      markUnavailable(error);
      return getAppConfig();
    } finally {
      status.checkedAt = new Date().toISOString();
    }
  }

  async function runTask(task) {
    if (typeof task !== "function") {
      return null;
    }

    try {
      const result = await task();
      if (!status.available) {
        await refresh();
      }
      return result;
    } catch (error) {
      markUnavailable(error);
      return null;
    }
  }

  function getAppConfig() {
    return {
      devMode,
      dbAvailable: status.available,
      multiplayerEnabled: status.available,
      dbStatusText: status.message,
      dbCheckedAt: status.checkedAt
    };
  }

  function start() {
    if (interval) {
      return;
    }

    interval = setInterval(refresh, refreshIntervalMs);
    interval.unref?.();
  }

  function stop() {
    if (!interval) {
      return;
    }

    clearInterval(interval);
    interval = null;
  }

  return {
    getAppConfig,
    refresh,
    runTask,
    start,
    stop
  };
}
