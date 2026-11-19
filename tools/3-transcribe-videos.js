// TOOL 3: transcribe_videos
// Turns the speech of each video into text. For every "name.mp4" it writes a
// "name.txt" next to it with only the spoken words.
import fs from "node:fs";
import path from "node:path";
import { extractAudio, splitAudio, makeTempFolder, removeFolder, hasFfmpeg, MAX_AUDIO_BYTES } from "./lib/audio.js";
import { getOpenAIKey, transcriptionModel, BACKUP_TRANSCRIPTION_MODEL } from "./lib/settings.js";
import { WORKSPACE, startClock } from "./lib/workspace.js";

// Videos, and also plain recordings of the sound (a person may bring those).
const VIDEO_TYPES = new Set([
  ".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v",
  ".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac",
]);

// File types the transcription service accepts as they are. Without FFmpeg we
// send the file itself, so only these types (and only up to 24 MB) can be heard.
const SENDABLE_AS_IS = {
  ".mp4": "video/mp4", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav",
  ".webm": "video/webm", ".ogg": "audio/ogg", ".flac": "audio/flac",
};

// A "transcribe everything again" batch (force=true) that was cut short may be
// continued by the next call for this long. After that, force starts over.
const REDO_WINDOW_MS = 30 * 60 * 1000;

// Fewer words than this usually means "music only" or noise, not real speech.
export const MIN_WORDS = 15;

export function countWords(text) {
  return (text.trim().match(/\S+/g) || []).length;
}

// Sends one audio file to OpenAI's speech to text service and returns the text.
async function askOpenAI(audioPath, model) {
  const form = new FormData();
  form.set("model", model);
  form.set("response_format", "text");
  const ext = path.extname(audioPath).toLowerCase();
  form.set("file", new Blob([fs.readFileSync(audioPath)], { type: SENDABLE_AS_IS[ext] || "audio/ogg" }), "audio" + (ext || ".ogg"));
  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${getOpenAIKey()}` },
      body: form,
    });
    return { status: res.status, ok: res.ok, body: await res.text() };
  } catch (err) {
    throw new Error(`Could not reach the transcription service: ${err.cause?.code || err.message}`);
  }
}

function readReason(body) {
  try {
    return JSON.parse(body).error?.message || body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

// Some models answer with plain text, others with {"text": "..."}.
function readText(body) {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.text === "string") return parsed.text.trim();
    } catch {
      // not JSON after all: keep the raw text
    }
  }
  return trimmed;
}

let modelInUse = null;

async function speechToText(audioPath, log = () => {}) {
  if (!modelInUse) modelInUse = transcriptionModel();
  let res = await askOpenAI(audioPath, modelInUse);

  // If OpenAI does not accept the chosen model (wrong name, no access, or it
  // does not like our request), fall back once to the backup model.
  const modelProblem = [400, 403, 404].includes(res.status);
  if (modelProblem && modelInUse !== BACKUP_TRANSCRIPTION_MODEL) {
    log(
      `The model "${modelInUse}" was not accepted (${res.status}: ${readReason(res.body)}). ` +
        `Switching to the backup model "${BACKUP_TRANSCRIPTION_MODEL}".`
    );
    modelInUse = BACKUP_TRANSCRIPTION_MODEL;
    res = await askOpenAI(audioPath, modelInUse);
  }

  if (!res.ok) {
    let reason = readReason(res.body);
    if (res.status === 401) reason = "the OpenAI key was rejected. A person needs to check OPENAI_API_KEY in the .env file.";
    if (res.status === 429) reason = "the OpenAI account is out of credit or sending too fast. " + reason;
    throw new Error(`The transcription service answered ${res.status}: ${reason}`);
  }
  return readText(res.body);
}

async function transcribeOne(videoPath, force, log) {
  const txtPath = videoPath.replace(/\.[^.]+$/, ".txt");
  const name = path.basename(videoPath);
  if (!force && fs.existsSync(txtPath)) {
    return { name, status: "skipped", words: countWords(fs.readFileSync(txtPath, "utf8")) };
  }
  // Without FFmpeg: send the file itself, if the service takes it as it is.
  if (!hasFfmpeg()) {
    const ext = path.extname(videoPath).toLowerCase();
    const megabytes = Math.round(fs.statSync(videoPath).size / 1024 / 1024);
    if (!SENDABLE_AS_IS[ext]) {
      throw new Error(
        `a ${ext} file can only be heard with the helper program FFmpeg, which is not on this computer. ` +
          `Ask the person for an .mp4 copy, or to have FFmpeg installed.`
      );
    }
    if (fs.statSync(videoPath).size > MAX_AUDIO_BYTES) {
      throw new Error(
        `the file is too big (${megabytes} MB) to be heard without the helper program FFmpeg (limit 24 MB). ` +
          `Ask the person for a smaller copy, or to have FFmpeg installed.`
      );
    }
    const text = await speechToText(videoPath, log);
    fs.writeFileSync(txtPath, text + "\n", "utf8");
    return { name, status: "transcribed", words: countWords(text) };
  }
  const temp = makeTempFolder();
  try {
    const audio = await extractAudio(videoPath, temp);
    let text;
    if (fs.statSync(audio).size <= MAX_AUDIO_BYTES) {
      text = await speechToText(audio, log);
    } else {
      log(`${name}: long audio, cutting it into pieces.`);
      const pieces = [];
      for (const part of await splitAudio(audio, temp)) pieces.push(await speechToText(part, log));
      text = pieces.join("\n").trim();
    }
    fs.writeFileSync(txtPath, text + "\n", "utf8");
    return { name, status: "transcribed", words: countWords(text) };
  } finally {
    removeFolder(temp);
  }
}

function resolveFolder(folder) {
  const raw = String(folder || "").trim().replace(/^@/, "");
  if (!raw) throw new Error("Tell me which folder to transcribe, for example: intrepidtravel");
  const options = [path.join(WORKSPACE, raw), path.join(WORKSPACE, raw.toLowerCase()), path.resolve(raw)];
  const found = options.find((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());
  if (!found) {
    throw new Error(
      `The folder "${raw}" does not exist in the workspace (${WORKSPACE}). ` +
        "Run list_videos and download_top_videos for this account first."
    );
  }
  return found;
}

export default {
  name: "transcribe_videos",
  title: "Turn the speech of videos into text",

  description:
    "Listens to every video (or sound recording) in a workspace folder and writes " +
    "down what is said. It does not need Instagram: it works on any files in the " +
    "folder, also on files the person saved there by hand, with any file name. " +
    "For each video it saves a text file with the same name (.txt) next to it, " +
    "containing only the spoken words. Videos that already have a text file are " +
    "skipped unless 'force' is true, so calling it again is safe. If one video " +
    "fails, the tool continues with the others. It works for about a minute per " +
    "call: if videos are left it says CALL AGAIN, and then you simply call it " +
    "again with the same inputs (this is normal, not a failure). The report says how many words each transcript has: a transcript " +
    "with very few words usually means the video is music only, so it should not " +
    "be used as evidence of how the account speaks. " +
    "Use this after download_top_videos, or after the person added their own files. Needs an OpenAI key.",

  inputSchema: {
    type: "object",
    properties: {
      folder: {
        type: "string",
        description:
          "The folder inside the workspace that holds the videos. Normally the " +
          "account name. Example: intrepidtravel",
      },
      force: {
        type: "boolean",
        description: "Optional. true = transcribe again even if a text file already exists.",
      },
    },
    required: ["folder"],
  },

  async run({ folder, force = false }, log = () => {}) {
    const dir = resolveFolder(folder);
    const videos = fs
      .readdirSync(dir)
      .filter((f) => VIDEO_TYPES.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (videos.length === 0) {
      // No videos, but maybe the transcripts are already there (prepared data).
      const ready = fs.readdirSync(dir).filter((f) => /\.txt$/i.test(f));
      if (ready.length === 0) {
        throw new Error(`There are no videos in ${dir}. Run download_top_videos first, or ask the person to save the video files into this folder (the tool open_folder shows it to them).`);
      }
      const words = ready.map((f) => ({ f, n: countWords(fs.readFileSync(path.join(dir, f), "utf8")) }));
      const thin = words.filter((w) => w.n < MIN_WORDS).map((w) => `${w.f} (${w.n} words)`);
      return [
        `Nothing to transcribe: there are no video files in this folder, but ${ready.length} transcripts are already here.`,
        `Folder: ${dir}`,
        `Usable transcripts (at least ${MIN_WORDS} words): ${ready.length - thin.length} of ${ready.length}.`,
        thin.length
          ? `Little or no speech (probably music only, do not use as evidence): ${thin.join(", ")}`
          : `Every transcript contains real speech.`,
      ].join("\n");
    }

    // A video is finished when its text file exists. With force, "finished"
    // means the text was rewritten since this redo batch began. The moment it
    // began is kept in a small note, so that calling the tool again continues
    // the batch instead of starting it over.
    const redoNote = path.join(dir, ".redo.json");
    let redoStartedAt = Date.now();
    if (force) {
      let note = null;
      try {
        note = JSON.parse(fs.readFileSync(redoNote, "utf8"));
      } catch {
        // no note: this call begins a new batch
      }
      if (note && !note.finished && Date.now() - note.startedAt < REDO_WINDOW_MS) {
        redoStartedAt = note.startedAt;
      } else {
        fs.writeFileSync(redoNote, JSON.stringify({ startedAt: redoStartedAt, finished: false }), "utf8");
      }
    }
    const textOf = (v) => path.join(dir, v.replace(/.[^.]+$/, ".txt"));
    const finished = (v) => {
      if (!fs.existsSync(textOf(v))) return false;
      if (!force) return true;
      return fs.statSync(textOf(v)).mtimeMs >= redoStartedAt;
    };

    // Check the two things this tool depends on before starting the batch,
    // but only if there is real work to do.
    if (videos.some((v) => !finished(v))) {
      getOpenAIKey();
      if (!hasFfmpeg()) log("FFmpeg is not on this computer: sending the files as they are (works up to 24 MB each).");
    }

    const clock = startClock();
    const results = [];
    const failed = [];
    let left = 0;
    for (const video of videos) {
      if (finished(video)) {
        const words = countWords(fs.readFileSync(textOf(video), "utf8"));
        results.push({ name: video, status: "skipped", words });
        continue;
      }
      // Short calls on purpose: an agent app gives up on a tool that takes too
      // long. When the time is up we leave the rest for the next call.
      if (clock.isUp()) {
        left++;
        continue;
      }
      try {
        const r = await transcribeOne(path.join(dir, video), true, log);
        results.push(r);
        log(`${r.name}: ${r.status}, ${r.words} words.`);
      } catch (err) {
        failed.push(`${video}: ${err.message}`);
        log(`${video}: failed and was skipped. ${err.message}`);
      }
    }

    if (force && left === 0) {
      fs.writeFileSync(redoNote, JSON.stringify({ startedAt: redoStartedAt, finished: true }), "utf8");
    }

    const done = results.filter((r) => r.status === "transcribed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const thin = results.filter((r) => r.words < MIN_WORDS).map((r) => `${r.name} (${r.words} words)`);
    const usable = results.length - thin.length;

    if (results.length === 0) {
      throw new Error(`No video could be transcribed. First problem: ${failed[0]}`);
    }

    return [
      left > 0
        ? `NOT FINISHED YET, CALL AGAIN: ${left} videos are still to transcribe. ` +
          `Call transcribe_videos again with the same inputs to continue. This is normal.`
        : `Done.`,
      `${done} transcribed now, ${skipped} already had a transcript, ${failed.length} failed.` +
        (done > 0 ? ` Speech to text model: ${modelInUse}.` : ""),
      `Folder: ${dir}`,
      `Usable transcripts (at least ${MIN_WORDS} words): ${usable} of ${results.length}.`,
      thin.length
        ? `Little or no speech (probably music only, do not use as evidence): ${thin.join(", ")}`
        : `Every transcript contains real speech.`,
      failed.length ? `Failed: ${failed.join(" | ")}` : `No failures.`,
    ].join("\n");
  },
};
