import { fork, spawn } from "node:child_process";
const api = fork(new URL("../server/index.mjs", import.meta.url), [], {
  stdio: ["inherit", "inherit", "inherit", "ipc"],
});
let vite;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill("SIGTERM");
  vite?.kill("SIGTERM");
  const timer = setTimeout(() => {
    api.kill("SIGKILL");
    vite?.kill("SIGKILL");
    process.exit(code);
  }, 2000);
  timer.unref();
  process.exitCode = code;
}
api.once("message", (message) => {
  if (message === "ready") {
    vite = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "--host",
        "127.0.0.1",
        ...process.argv.slice(2),
      ],
      { stdio: "inherit" },
    );
    vite.on("exit", (code) => stop(code || 0));
    vite.on("error", () => stop(1));
  }
});
api.on("exit", (code) => stop(code || 0));
api.on("error", () => stop(1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
