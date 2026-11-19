// TOOL 1: list_videos
// Makes a table of the videos on a public Instagram account, with their numbers
// (likes, views, comments). Saves it as workspace/<account>/videos.csv
import fs from "node:fs";
import { fetchAccountVideos, currentPause, pauseMessage, waivePauseOnce } from "./lib/instagram.js";
import { fetchAccountVideosMeta, metaConfigured } from "./lib/meta.js";
import { readVideoList, mergeVideoLists, writeVideoList, sortBy } from "./lib/csv.js";
import { cleanAccount, videoListPath } from "./lib/workspace.js";

// A list younger than this is reused instead of asking Instagram again.
const FRESH_HOURS = Number(process.env.IG_FRESH_HOURS || 6);

function ageInHours(file) {
  try {
    return (Date.now() - fs.statSync(file).mtimeMs) / 3600000;
  } catch {
    return Infinity;
  }
}

function describeAge(hours) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes ago`;
  if (hours < 48) return `${Math.round(hours)} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function topThree(list, by) {
  return sortBy(list, by)
    .slice(0, 3)
    .map((v, i) => `  ${i + 1}. ${v[by] || 0} ${by}: ${v.url}`)
    .join("\n");
}

// The short summary at the end of every answer: the top of both rankings.
function tops(list) {
  const lines = [`Most liked:\n${topThree(list, "likes")}`];
  if (list.some((v) => Number(v.views) > 0)) lines.push(`Most viewed:\n${topThree(list, "views")}`);
  else lines.push(`The list has no view numbers, so it can only be ranked by likes.`);
  return lines.join("\n");
}

export default {
  name: "list_videos",
  title: "List the videos of an Instagram account",

  // THE LABEL. This text is all the AI model knows about the tool.
  // A clear label = the model picks the right tool at the right time.
  description:
    "Looks at a PUBLIC Instagram account (no login needed) and makes a list of " +
    "its recent videos with the date, likes, views, comments and caption of each " +
    "one. Saves the list as a table in workspace/<account>/videos.csv, newest " +
    "first. To avoid being blocked by Instagram it is deliberately gentle: it " +
    "reads 5 pages (about 60 posts) unless told otherwise, waits a few seconds " +
    "between pages, and reuses a list collected in the last 6 hours instead of " +
    "asking again (set refresh to true to force a new collection). If Instagram " +
    "refuses, the tool stops, keeps the existing list and says until when to " +
    "wait. Do not call it again before that time, and never delete the pause " +
    "note. Only if the person says they are now on a different internet " +
    "connection, call it once with newNetwork set to true. If the person set up " +
    "the official Instagram route (a Meta key in their key file), the tool uses " +
    "that route by itself: it is not affected by refusals or pauses, but it only " +
    "reads professional accounts. " +
    "Use this first, before downloading or transcribing anything.",

  // THE FORM the model fills in to use the tool.
  inputSchema: {
    type: "object",
    properties: {
      account: {
        type: "string",
        description: "The Instagram account name, with or without @. Example: intrepidtravel",
      },
      maxPages: {
        type: "integer",
        minimum: 1,
        maximum: 30,
        description:
          "Optional. How many pages of posts to read (12 posts per page). " +
          "Default 5. Use 1 for a quick look. More pages means more risk of a block.",
      },
      refresh: {
        type: "boolean",
        description:
          "Optional. true = ask Instagram again even if a recent list exists. Default false.",
      },
      newNetwork: {
        type: "boolean",
        description:
          "Optional. true = the PERSON said, in their own words, that they changed to a " +
          "different internet connection since Instagram refused. Allows one single try " +
          "during a pause. Never set it on your own initiative.",
      },
    },
    required: ["account"],
  },

  async run({ account, maxPages, refresh = false, newNetwork = false }, log = () => {}) {
    const name = cleanAccount(account);
    const file = videoListPath(name);
    const before = await readVideoList(file);
    const age = ageInHours(file);

    // 1. A recent list is good enough: do not bother Instagram.
    if (before.length > 0 && !refresh && age < FRESH_HOURS) {
      return [
        `Used the list collected ${describeAge(age)} (${before.length} videos). ` +
          `Instagram was not contacted. Say refresh=true to collect again.`,
        `Saved at: ${file}`,
        tops(before),
      ].join("\n");
    }

    const pages = Math.min(Math.max(1, Number(maxPages) || 5), 30);

    // 2. The official route, when the person set it up (a Meta key in the key
    //    file). It has no "visitor" refusals, so it goes first, and it works
    //    even while the public website is paused.
    let officialProblem = "";
    if (metaConfigured()) {
      try {
        const official = await fetchAccountVideosMeta(name, { maxPosts: pages * 12, log });
        if (official.videos.length > 0) {
          const { merged, added, updated } = mergeVideoLists(before, official.videos);
          await writeVideoList(file, merged);
          return [
            `Done, through the official Instagram route. @${name} now has ${merged.length} videos in the list ` +
              `(${added} new, ${updated} refreshed). The public website was not contacted.`,
            `Saved at: ${file}`,
            tops(merged),
            official.withoutFile > 0
              ? `Note: for ${official.withoutFile} of these videos the official route gives the numbers but not the ` +
                `video file (licensed music, or the owner turned downloads off). If one of them is in the top, ` +
                `download_top_videos will name it and the person can bring that file themselves.`
              : `Every video in the list comes with its file.`,
            official.problems.length
              ? `Problems along the way (the list may be incomplete): ${official.problems.join(" | ")}`
              : `No problems along the way.`,
          ].join("\n");
        }
        officialProblem = `The official route answered, but found no videos for @${name}.`;
      } catch (err) {
        officialProblem =
          err.kind === "account"
            ? `The official route cannot read @${name} (it only reads professional accounts that are not age-restricted): ${err.message}`
            : `The official route did not work: ${err.message}`;
      }
      log(officialProblem + " Trying the public website instead.");
    }
    const also = officialProblem ? ` ALSO: ${officialProblem}` : "";

    // 3. Instagram refused us earlier: respect the pause. The only exception is
    //    one try when the person says they are on a different connection.
    let pause = currentPause();
    if (pause && newNetwork) {
      const waived = waivePauseOnce();
      if (waived.ok) {
        log("The person changed internet connection: making one careful try during the pause.");
        pause = null;
      } else if (before.length === 0) {
        throw new Error(waived.message + ` There is no earlier list for @${name}.` + also);
      }
    }
    if (pause) {
      if (before.length > 0) {
        return [
          pauseMessage(pause),
          `Kept the existing list for @${name}: ${before.length} videos, collected ${describeAge(age)}.`,
          `Saved at: ${file}`,
          tops(before),
          officialProblem,
        ]
          .filter(Boolean)
          .join("\n");
      }
      throw new Error(pauseMessage(pause) + ` There is no earlier list for @${name}.` + also);
    }

    // 4. Ask the public website, gently.
    const result = await fetchAccountVideos(name, { maxPages: pages, log });
    const { merged, added, updated } = mergeVideoLists(before, result.videos);

    if (merged.length === 0) {
      throw new Error(
        `No videos could be collected for @${name}. ` +
          (result.problems.join(" ") || "Instagram returned nothing.") +
          " Nothing was saved." +
          also +
          (result.noInternet ? "" : " Continue with an account that already has data in the workspace.")
      );
    }
    if (result.videos.length > 0) await writeVideoList(file, merged);

    return [
      result.videos.length > 0
        ? `Done. @${name} now has ${merged.length} videos in the list ` +
          `(${added} new, ${updated} refreshed, ${result.pages} pages read).`
        : `Nothing new was collected. Kept the existing list for @${name}: ${merged.length} videos, collected ${describeAge(age)}.`,
      `Saved at: ${file}`,
      tops(merged),
      result.paused
        ? `IMPORTANT: ${result.paused}`
        : result.problems.length
          ? `Problems along the way (the list may be incomplete): ${result.problems.join(" | ")}`
          : `No problems along the way.`,
      officialProblem,
    ]
      .filter(Boolean)
      .join("\n");
  },
};
