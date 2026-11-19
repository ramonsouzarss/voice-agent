// Pulls the sound out of a video file. Video files are heavy; for a transcript
// we only need the voice, so we make a tiny audio file (mono, low quality but
// clear speech). The work is done by FFmpeg, a free program for audio/video.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { AGENT_ROOT } from "./workspace.js";

// The transcription service accepts files up to 25 MB. We stay a bit below.
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

let ffmpegPath = null;
let ffmpegMissing = null;

// Where to look for FFmpeg, in order:
//   1. the FFMPEG_PATH setting (FFMPEG_PATH=none means "work without it"),
//   2. a copy placed in tools/bin, 3. the copy that ships with the original
//   Portuguese project, 4. an FFmpeg installed on the computer.
// An app started from the desktop often does not know where programs were
// installed, so we also look in the usual places of each system ourselves.
function usualPlaces(exe) {
  const home = os.homedir();
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    return [
      path.join(local, "Microsoft", "WinGet", "Links", exe),
      path.join(process.env.ProgramData || "C:\\ProgramData", "chocolatey", "bin", exe),
      path.join(home, "scoop", "shims", exe),
      path.join(process.env.ProgramFiles || "C:\\Program Files", "ffmpeg", "bin", exe),
      "C:\\ffmpeg\\bin\\" + exe,
    ];
  }
  if (process.platform === "darwin") {
    return ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/local/bin/ffmpeg"];
  }
  return ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/snap/bin/ffmpeg", path.join(home, ".local", "bin", "ffmpeg")];
}

export function findFfmpeg() {
  if (ffmpegPath) return ffmpegPath;
  const missing = () =>
    new Error(
      "FFmpeg (the program that extracts audio from video) was not found on this computer. " +
        "A person needs to install it (https://ffmpeg.org/download.html) or set FFMPEG_PATH in the .env file."
    );
  if (ffmpegMissing) throw missing();
  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const setting = (process.env.FFMPEG_PATH || "").trim();
  if (setting.toLowerCase() === "none") {
    ffmpegMissing = true;
    throw missing();
  }
  const candidates = [
    setting,
    path.join(AGENT_ROOT, "tools", "bin", exe),
    path.resolve(AGENT_ROOT, "..", "..", "resources", "mcps", "video-transcricao", "node_modules", "ffmpeg-static", exe),
    "ffmpeg",
    ...usualPlaces(exe),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate !== "ffmpeg" && !fs.existsSync(candidate)) continue;
    const check = spawnSync(candidate, ["-version"], { stdio: "ignore" });
    if (check.status === 0) {
      ffmpegPath = candidate;
      return ffmpegPath;
    }
  }
  ffmpegMissing = true;
  throw missing();
}

// FFmpeg is a helper, not a must: most videos can be heard without it.
export function hasFfmpeg() {
  try {
    findFfmpeg();
    return true;
  } catch {
    return false;
  }
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(findFfmpeg(), ["-hide_banner", "-loglevel", "error", "-y", ...args]);
    let errors = "";
    child.stderr.on("data", (d) => (errors += d.toString()));
    child.on("error", (err) => reject(new Error(`Could not start FFmpeg: ${err.message}`)));
    child.on("close", (code) => {
      if (code === 0) return resolve();
      const reason = /does not contain any stream|matches no streams/i.test(errors)
        ? "the video has no sound track"
        : errors.trim().split("\n").pop() || `exit code ${code}`;
      reject(new Error(`Could not extract the audio: ${reason}`));
    });
  });
}

export function makeTempFolder() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "voice-agent-"));
}

export function removeFolder(dir) {
  if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// Video in, small speech-only audio file out.
export async function extractAudio(videoPath, outDir) {
  const out = path.join(outDir, "audio.ogg");
  await runFfmpeg([
    "-i", videoPath,
    "-vn", "-ac", "1", "-ar", "16000",
    "-c:a", "libopus", "-b:a", "16k", "-application", "voip",
    "-f", "ogg", out,
  ]);
  return out;
}

// Safety net for very long videos: cut the audio into one-hour pieces.
export async function splitAudio(audioPath, outDir) {
  await runFfmpeg([
    "-i", audioPath,
    "-f", "segment", "-segment_time", "3600", "-c", "copy", "-reset_timestamps", "1",
    path.join(outDir, "part_%03d.ogg"),
  ]);
  const parts = fs
    .readdirSync(outDir)
    .filter((f) => /^part_\d+\.ogg$/.test(f))
    .sort()
    .map((f) => path.join(outDir, f));
  if (parts.length === 0) throw new Error("Cutting the audio into pieces produced nothing.");
  return parts;
}
