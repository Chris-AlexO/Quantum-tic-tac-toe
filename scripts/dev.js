import { spawn } from "node:child_process";
import net from "node:net";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const backendPort = Number(process.env.PORT || 3000);
const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";
const backendIsRunning = await canConnect(backendPort);

const commands = [
  ...(backendIsRunning ? [] : ["dev:server"]),
  "client:dev"
];

let shuttingDown = false;

if (backendIsRunning) {
  console.log(`Backend already running on http://127.0.0.1:${backendPort}`);
  console.log("Use the Vite URL below for hot reload; the backend URL may still serve built files.");
}
console.log(`Open ${viteDevServerUrl} for hot reload.`);

const children = commands.map((script) => {
  const child = spawn(npmCommand, ["run", script], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: viteDevServerUrl
    }
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shutdown(code ?? (signal ? 1 : 0));
  });

  return child;
});

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.setTimeout(300);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}
