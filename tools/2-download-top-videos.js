// TOOL 2: download_top_videos
// Reads the video list, picks the top videos (most liked, or most viewed) and
// downloads them into workspace/<account>/ as "<rank>_<code>.mp4" (1 = the top).
import fs from "node:fs";
import path from "node:path";
import { resolveVideoFileUrl, downloadFile, currentPause, pauseMessage } from "./lib/instagram.js";
import { readVideoList, sortBy, cleanRanking } from "./lib/csv.js";
import { cleanAccount, accountFolder, videoListPath, startClock, sleep } from "./lib/workspace.js";

export default {
  name: "download_top_videos",
  title: "Download the top videos of an account",

  description:
    "Reads the video list of an account (workspace/<account>/videos.csv, made by " +
    "list_videos), ranks the videos and downloads the top ones into the same " +
    "folder. Ranks by likes unless told otherwise: set by to \"views\" when the " +
    "person asks for the most VIEWED videos. Files are named <rank>_<code>.mp4, " +
    "where rank 1 is the top video. Videos that are already in the folder are " +
    "skipped, so calling it again is safe and never downloads twice. If one video " +
    "fails, the tool continues with the next and reports which ones failed. It " +
    "waits a few seconds between videos. It works for about a minute per call: " +
    "if videos are left it says CALL AGAIN, and then you simply call it again " +
    "with the same inputs (this is normal, not a failure). If Instagram asks to " +
    "slow down or refuses, it stops at once and says until when to wait: do not " +
    "call it again before that time. Use this after list_videos and before transcribe_videos.",

  inputSchema: {
    type: "object",
    properties: {
      account: {
        type: "string",
        description: "The Instagram account name. Example: intrepidtravel",
      },
      count: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description: "How many of the top videos to download. Default: 10.",
      },
      by: {
        type: "string",
        enum: ["likes", "views"],
        description:
          "Optional. How to rank the videos: \"likes\" (default) or \"views\". " +
          "Use \"views\" when the person asks for the most viewed or most watched videos.",
      },
    },
    required: ["account"],
  },

  async run({ account, count = 10, by = "likes" }, log = () => {}) {
    const clock = startClock();
    const name = cleanAccount(account);
    const ranking = cleanRanking(by);
    const folder = accountFolder(name);
    const list = await readVideoList(videoListPath(name));
    if (list.length === 0) {
      throw new Error(
        `There is no video list for @${name} yet. Run list_videos for this account first.`
      );
    }

    // A video without a number for this ranking cannot be ranked by it.
    const rankable = list.filter((v) => v.shortcode && (ranking === "likes" || Number(v[ranking]) > 0));
    if (rankable.length === 0) {
      throw new Error(
        `The list of @${name} has no numbers for ${ranking}, so the videos cannot be ranked by ${ranking}. ` +
          `Ask the person if ranking by likes is fine.`
      );
    }
    const chosen = sortBy(rankable, ranking).slice(0, count);
    const existing = fs.existsSync(folder) ? fs.readdirSync(folder) : [];

    const downloaded = [];
    const skipped = [];
    const failed = [];
    let paused = null;
    let notTried = 0;
    let outOfTime = false;

    for (let i = 0; i < chosen.length; i++) {
      const rank = i + 1;
      const video = chosen[i];
      const fileName = `${rank}_${video.shortcode}.mp4`;

      // "Already there" means we have the video file, or we already have its
      // transcript from an earlier run (then the video is not needed again).
      const already =
        existing.find((f) => f.endsWith(`_${video.shortcode}.mp4`)) ||
        existing.find((f) => f.endsWith(`_${video.shortcode}.txt`));
      if (already) {
        skipped.push(already);
        log(`#${rank} already in the folder (${already}), skipped.`);
        continue;
      }
      // A video that came through the official route is fetched from the
      // address Meta gave us, pause or no pause. When Meta gave no address
      // (licensed music, or the owner turned downloads off) we do NOT go and
      // knock on the public website instead: the person can bring that file.
      const official = video.source === "meta";
      if (official && !video.video_url) {
        failed.push(
          `${fileName}: the official route does not hand out this video file (licensed music, or its owner ` +
            `turned downloads off). The person can save it themselves: ${video.url}`
        );
        log(`#${rank} has no file on the official route, skipped.`);
        continue;
      }
      // During a pause we do not fetch anything from the public website, not
      // even a file whose address we already know.
      const pause = official ? null : currentPause();
      if (pause) {
        paused = pauseMessage(pause);
        notTried = chosen.length - i;
        log(`Stopped at #${rank}: Instagram is paused.`);
        break;
      }
      // Short calls on purpose: an agent app gives up on a tool that takes too
      // long. We stop here and ask to be called again for the rest.
      if (clock.isUp()) {
        outOfTime = true;
        notTried = chosen.length - i;
        break;
      }
      try {
        // The list usually knows the address of the video file already. Only
        // when it does not (or the address expired) we ask Instagram for it.
        let done = false;
        if (video.video_url) {
          try {
            await downloadFile(video.video_url, path.join(folder, fileName));
            done = true;
            // a short breath between files, like a person would take
            await sleep(2000 + Math.random() * 2000);
          } catch (err) {
            // An expired address. On the public route we ask for a fresh one
            // below. On the official route a new list brings fresh addresses.
            if (official) {
              throw new Error(
                `the address of this file no longer works (${err.message}). ` +
                  `Call list_videos with refresh=true, then this tool again.`
              );
            }
          }
        }
        if (!done) {
          const fileUrl = await resolveVideoFileUrl(video.shortcode);
          await downloadFile(fileUrl, path.join(folder, fileName));
        }
        downloaded.push(fileName);
        log(`#${rank} downloaded: ${fileName} (${video[ranking] || 0} ${ranking}).`);
      } catch (err) {
        if (err.paused) {
          // Instagram asked us to slow down: stop the whole batch right here.
          paused = err.message;
          notTried = chosen.length - i;
          log(`Stopped at #${rank}: Instagram refused.`);
          break;
        }
        failed.push(`${fileName}: ${err.message}`);
        log(`#${rank} failed and was skipped: ${err.message}`);
      }
    }

    if (downloaded.length + skipped.length === 0) {
      throw new Error(
        paused
          ? `No video was downloaded. ${paused}`
          : `None of the ${chosen.length} videos could be downloaded. Do not retry right away. ` +
            `What happened: ${failed.join(" | ") || "unknown"}`
      );
    }

    const ranked = chosen
      .map((v, i) => `  ${i + 1}. ${v[ranking] || 0} ${ranking}: ${v.url}`)
      .join("\n");

    return [
      outOfTime
        ? `NOT FINISHED YET, CALL AGAIN: ${notTried} videos are still to download. ` +
          `Call download_top_videos again with the same inputs to continue. This is normal.`
        : `Done.`,
      `${downloaded.length} downloaded now, ${skipped.length} already there, ` +
        `${failed.length} failed (asked for the top ${count} by ${ranking}, of ${list.length} in the list).`,
      `Folder: ${folder}`,
      `The top ${chosen.length} by ${ranking}:\n${ranked}`,
      failed.length ? `Failed: ${failed.join(" | ")}` : `No failures.`,
      paused ? `IMPORTANT: ${notTried} videos were not tried. ${paused}` : ``,
    ]
      .filter(Boolean)
      .join("\n");
  },
};
