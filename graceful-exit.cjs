// Preloaded by the Docker CMD (node -r ./graceful-exit.cjs server.js) together with NEXT_MANUAL_SIG_HANDLE=1.
// A release stops the old machine with SIGTERM. Next's own handler would close the server at once, and a request that was already on its way
// from the proxy over a kept-alive connection got a 502 (seen in the 29/10/2026 probe). Instead the old machine keeps answering for a few
// seconds, while the proxy moves traffic to the new machine, and then exits. Fly's kill_timeout (fly.toml) is longer than this wait.
const DRAIN_MS = 12_000;
let stopping = false;
const stop = (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`[graceful] ${signal}: still answering for ${DRAIN_MS / 1000} s, then exit`);
  setTimeout(() => process.exit(0), DRAIN_MS);
};
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
