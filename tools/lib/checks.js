// The health checks: is everything the tools need present on this computer?
// Used by the tool check_setup (for the agent) and by preflight.mjs (for a
// person in a terminal). Nothing here contacts Instagram: checking Instagram
// again and again is itself a way to get blocked.
import fs from "node:fs";
import path from "node:path";
import { instagramStatus, pauseMessage } from "./instagram.js";
import { findFfmpeg, hasFfmpeg } from "./audio.js";
import { getOpenAIKey } from "./settings.js";
import { metaConfigured, checkMeta } from "./meta.js";
import { WORKSPACE } from "./workspace.js";

const MIN_WORDS = 15;
const countWords = (text) => (text.trim().match(/\S+/g) || []).length;

// Each check returns { state: "ok" | "problem" | "info", name, detail, fix }.
async function check(name, fn, fix) {
  try {
    const detail = (await fn()) || "";
    return { state: "ok", name, detail, fix: "" };
  } catch (err) {
    return { state: "problem", name, detail: err.message, fix: err.fix || fix };
  }
}

function collectedData() {
  const accounts = fs.existsSync(WORKSPACE)
    ? fs.readdirSync(WORKSPACE).filter((d) => fs.statSync(path.join(WORKSPACE, d)).isDirectory())
    : [];
  return accounts
    .map((a) => {
      const dir = path.join(WORKSPACE, a);
      const files = fs.readdirSync(dir);
      const usable = files
        .filter((f) => /\.txt$/i.test(f))
        .filter((f) => countWords(fs.readFileSync(path.join(dir, f), "utf8")) >= MIN_WORDS).length;
      const hasList = files.includes("videos.csv");
      const videos = files.filter((f) => /\.mp4$/i.test(f)).length;
      if (!usable && !hasList && !videos) return null;
      return `${a} (${hasList ? "video list" : "no video list"}, ${videos} video files, ${usable} usable transcripts)`;
    })
    .filter(Boolean);
}

export async function runChecks() {
  const results = [];

  results.push(
    await check(
      "Node.js is recent enough",
      () => {
        const major = Number(process.versions.node.split(".")[0]);
        if (major < 18) throw new Error(`Node ${process.versions.node} is too old.`);
        return `Node ${process.versions.node} on ${process.platform}`;
      },
      "A person needs to install Node.js 18 or newer from https://nodejs.org"
    )
  );

  // FFmpeg is a helper. Without it the tools still hear most videos.
  results.push(
    hasFfmpeg()
      ? { state: "ok", name: "FFmpeg is installed (helper to listen to videos)", detail: `found: ${findFfmpeg()}`, fix: "" }
      : {
          state: "info",
          name: "FFmpeg is not installed (optional)",
          detail:
            "The tools still work: they send each video as it is, which is slower and limited to .mp4 files up to 24 MB. " +
            "Only mention FFmpeg to the person if a video turns out to be too big.",
          fix: "",
        }
  );

  results.push(
    await check(
      "The OpenAI key works (needed to turn speech into text)",
      async () => {
        const key = getOpenAIKey();
        let res;
        try {
          res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
        } catch (err) {
          const e = new Error(
            `NO INTERNET FROM HERE: this program could not reach OpenAI at all (${err.cause?.code || err.message}). ` +
              `The key was not tested.`
          );
          e.fix =
            "This usually means the check was started as a command inside an app's protected space. " +
            "Use the toolbox tools from your tool list instead. Do not ask the person to run commands.";
          throw e;
        }
        if (res.status === 401) throw new Error("OpenAI rejected the key.");
        if (res.status === 429) throw new Error("The OpenAI account is out of credit or over its limit.");
        if (!res.ok) throw new Error(`OpenAI answered ${res.status}.`);
        return "OpenAI accepted the key";
      },
      "Ask the person to check the line OPENAI_API_KEY in the .env file, and the credit of their OpenAI account. " +
        "You never read that file. If there is no key file yet, the setup makes one with the empty label for them."
    )
  );

  // The official Instagram route is optional. Without its key we say so and
  // move on; with a key we test it (one small question to Meta, not Instagram).
  if (metaConfigured()) {
    results.push(
      await check(
        "The official Instagram route works (Meta key)",
        async () => `Meta accepted the key. It reads Instagram as ${await checkMeta()}`,
        "Tell the person what the message says, in plain words. Without this route the tools still use the public website."
      )
    );
  } else {
    results.push({
      state: "info",
      name: "Official Instagram route: not set up (optional)",
      detail:
        "The tools read the public website. Only bring this up if Instagram keeps refusing and the person wants a lasting fix " +
        "(docs/official-instagram-route.md).",
      fix: "",
    });
  }

  // Instagram: we report what we already know. No request is made.
  const ig = instagramStatus();
  if (ig.pause) {
    results.push({
      state: "problem",
      name: "Instagram is paused",
      detail: pauseMessage(ig.pause),
      fix:
        "Nothing to install and nothing the person did wrong. Offer the ways forward from AGENTS.md " +
        '("When Instagram refuses"). Everything except collecting from Instagram still works.',
    });
  } else if (ig.lastOk) {
    results.push({
      state: "ok",
      name: "Instagram answered the last time we asked",
      detail: `last good collection: ${new Date(ig.lastOk).toLocaleString("en-GB")}. Not contacted now.`,
      fix: "",
    });
  } else {
    results.push({
      state: "info",
      name: "Instagram: not tried yet",
      detail:
        "No pause is active. This check never contacts Instagram, so the real test is the first list_videos.",
      fix: "",
    });
  }

  const data = collectedData();
  results.push({
    state: "info",
    name: "Data already in the workspace",
    detail: data.length ? data.join("; ") : "none yet (normal for a fresh copy)",
    fix: "",
  });

  return results;
}

export function describeChecks(results) {
  const label = { ok: "OK      ", problem: "PROBLEM ", info: "INFO    " };
  const lines = results.map(
    (r) =>
      `${label[r.state]}${r.name}${r.detail ? `: ${r.detail}` : ""}` +
      (r.state === "problem" && r.fix ? `\n         What to do: ${r.fix}` : "")
  );
  const problems = results.filter((r) => r.state === "problem");
  lines.push(
    problems.length === 0
      ? "\nEverything the tools need is in place."
      : `\n${problems.length} thing(s) need attention: ${problems.map((r) => r.name).join("; ")}.`
  );
  return lines.join("\n");
}
