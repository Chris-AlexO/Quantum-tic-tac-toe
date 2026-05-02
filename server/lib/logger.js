function writeLog(method, scope, message, context) {
  const prefix = `[${new Date().toISOString()}] [${scope}] ${message}`;
  if (context === undefined) {
    console[method](prefix);
    return;
  }

  console[method](prefix, context);
}

export function createLogger(scope) {
  return {
    debug(message, context) {
      if (process.env.NODE_ENV === "production") {
        return;
      }

      writeLog("debug", scope, message, context);
    },

    info(message, context) {
      writeLog("info", scope, message, context);
    },

    warn(message, context) {
      writeLog("warn", scope, message, context);
    },

    error(message, context) {
      writeLog("error", scope, message, context);
    }
  };
}
