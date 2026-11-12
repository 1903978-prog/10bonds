// Reads `flyctl machines list --json` on stdin and a machine id in REMOVE_MACHINE; exits 0 only if removing it is safe (lib/flyLeftovers.ts).
import { canRemoveNamed } from "../lib/flyLeftovers";
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  const r = canRemoveNamed(JSON.parse(raw || "[]"), process.env.REMOVE_MACHINE ?? "");
  console.log(r.reason);
  process.exit(r.ok ? 0 : 1);
});
