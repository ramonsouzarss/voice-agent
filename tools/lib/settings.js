// Private settings (the secret key for the transcription service) live in a
// file called ".env". It is never shared. We look for it in this folder and in
// the folders above it.
//
// A person who makes that file with Notepad often ends up with ".env.txt"
// without noticing (Windows hides the ".txt"). That is the same file to us.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function findSettingsFile() {
  let dir = here;
  for (let i = 0; i < 10; i++) {
    for (const name of [".env", ".env.txt"]) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export let SETTINGS_FILE = null;

// The names that came from the key file (and not from the computer itself).
const fromFile = new Set();

// Reads the key file. This happens at the start, and again every time a tool
// asks for a key: the toolbox can stay open for days, and the person may add
// or replace a key in the meantime. Without this, a key pasted today would
// only be seen after the app is closed and opened again.
function readSettingsFile() {
  SETTINGS_FILE = findSettingsFile();
  const found = new Map();
  if (SETTINGS_FILE) {
    let text;
    try {
      text = fs.readFileSync(SETTINGS_FILE, "utf8");
    } catch {
      return; // the file is being saved right now: keep what we had
    }
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || found.has(m[1])) continue;
      found.set(m[1], m[2].replace(/^["']|["']$/g, "").trim());
    }
  }
  for (const [name, value] of found) {
    // A value the computer itself already had is never replaced.
    if (process.env[name] === undefined || fromFile.has(name)) {
      process.env[name] = value;
      fromFile.add(name);
    }
  }
  // A line the person removed from the file is forgotten here too.
  for (const name of [...fromFile]) {
    if (!found.has(name)) {
      delete process.env[name];
      fromFile.delete(name);
    }
  }
}

readSettingsFile();

// The labels a key file can hold. The first is needed, the second is optional.
export const OPENAI_LABEL = "OPENAI_API_KEY";
export const META_LABEL = "META_ACCESS_TOKEN";

// For the setup report: is there a settings file, and does it hold a key?
// Says yes or no only. The keys themselves never leave this file.
export function keyStatus() {
  readSettingsFile();
  return {
    file: SETTINGS_FILE,
    hasKey: !!(process.env[OPENAI_LABEL] || "").trim(),
    hasMeta: !!(process.env[META_LABEL] || "").trim(),
  };
}

// The optional key for the official Instagram route (Meta). Empty = not used.
export function getMetaToken() {
  readSettingsFile();
  return (process.env[META_LABEL] || "").trim();
}

export function getOpenAIKey() {
  readSettingsFile();
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "The key for the transcription service (OpenAI) is missing. " +
        (SETTINGS_FILE
          ? `The settings file ${SETTINGS_FILE} does not contain OPENAI_API_KEY.`
          : "No .env settings file was found.") +
        " Run the setup (skills/setup/SKILL.md): it makes the key file with the empty label OPENAI_API_KEY= " +
        "and the person pastes their key after the = themselves. The agent never reads that file and never types a key."
    );
  }
  return key;
}

// Which OpenAI speech to text model to use. Change it with a line in the .env
// file, for example: OPENAI_TRANSCRIBE_MODEL=whisper-1
export const DEFAULT_TRANSCRIPTION_MODEL = "gpt-transcribe";
export const BACKUP_TRANSCRIPTION_MODEL = "whisper-1";

export function transcriptionModel() {
  readSettingsFile();
  return (process.env.OPENAI_TRANSCRIBE_MODEL || DEFAULT_TRANSCRIPTION_MODEL).trim();
}
