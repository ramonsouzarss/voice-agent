// Where the agent keeps its files (its "desk" and long-term memory).
// Every account gets its own folder: workspace/<account>/
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const AGENT_ROOT = path.resolve(here, "..", "..");
export const WORKSPACE = process.env.WORKSPACE_DIR
  ? path.resolve(process.env.WORKSPACE_DIR)
  : path.join(AGENT_ROOT, "workspace");

// "@IntrepidTravel " -> "intrepidtravel"
export function cleanAccount(value) {
  const name = String(value || "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(name)) {
    throw new Error(
      `"${value}" does not look like an Instagram account name. ` +
        `Use only the name, for example: intrepidtravel`
    );
  }
  return name;
}

export function accountFolder(account) {
  return path.join(WORKSPACE, cleanAccount(account));
}

export function videoListPath(account) {
  return path.join(accountFolder(account), "videos.csv");
}

// A stopwatch for the tools that work through a batch (download, transcribe).
// Agent apps give up on a tool call that takes too long, so a tool works for
// about this many seconds, then reports what is done and asks to be called
// again for the rest. Change with TOOL_SECONDS (0 = no limit).
export function startClock() {
  const raw = process.env.TOOL_SECONDS;
  const seconds = raw === undefined || raw === "" ? 40 : Number(raw);
  const limit = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Infinity;
  const startedAt = Date.now();
  return { isUp: () => Date.now() - startedAt >= limit };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
