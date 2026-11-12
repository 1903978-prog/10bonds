// Reads `flyctl machines list --json` on stdin; prints the ids of leftover machines from a failed release (lib/flyLeftovers.ts), one per line.
import { leftoverMachines } from "../lib/flyLeftovers";
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  const r = leftoverMachines(JSON.parse(raw || "[]"));
  console.error(r.reason);
  for (const id of r.destroy) console.log(id);
});
