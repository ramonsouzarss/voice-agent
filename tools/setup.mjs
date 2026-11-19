#!/usr/bin/env node
// SETUP HELPER, for the agent (the person never runs this).
// -----------------------------------------------------------------------------
// The agent runs it during setup to learn about the computer it is on, and to
// plug the toolbox into Claude Desktop when the person agrees.
//
//   node tools/setup.mjs              looks around and reports. Changes nothing.
//   node tools/setup.mjs key          makes the key file with an empty label and
//                                     opens it for the person to paste the key
//   node tools/setup.mjs key meta     the same, plus the empty label for the
//                                     optional official Instagram route (Meta)
//   node tools/setup.mjs key open     only opens the key file, for the person
//                                     to replace a key themselves
//   node tools/setup.mjs connect      adds the toolbox to Claude Desktop
//   node tools/setup.mjs disconnect   takes it out again
//
// The report is written for the agent: plain facts, then the next steps for
// THIS system (Windows, macOS or Linux). The method lives in
// skills/setup/SKILL.md.
// -----------------------------------------------------------------------------
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { AGENT_ROOT } from "./lib/workspace.js";
import { hasFfmpeg } from "./lib/audio.js";
import { keyStatus, OPENAI_LABEL, META_LABEL } from "./lib/settings.js";
import { runChecks, describeChecks } from "./lib/checks.js";

const SERVER_NAME = "voice-agent-toolbox";
const TOOLBOX = path.join(AGENT_ROOT, "tools", "toolbox.js");
const action = process.argv[2] || "report";

// --- what system is this? ----------------------------------------------------
function systemName() {
  try {
    if (process.platform === "win32") return os.version(); // "Windows 11 Pro"
    if (process.platform === "darwin") {
      const v = spawnSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).stdout.trim();
      return `macOS ${v}`;
    }
    const text = fs.readFileSync("/etc/os-release", "utf8");
    return text.match(/^PRETTY_NAME="?([^"\n]+)"?/m)?.[1] || "Linux";
  } catch {
    return process.platform;
  }
}

function has(program, args = ["--version"]) {
  try {
    // (On Windows some programs, like winget, only answer through the shell.)
    return process.platform === "win32"
      ? spawnSync(`${program} ${args.join(" ")}`, { stdio: "ignore", shell: true }).status === 0
      : spawnSync(program, args, { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

// The program each system uses to install other programs, and the command
// that installs FFmpeg with it. (Node.js is already here, or this file would
// not be running.)
function installer() {
  if (process.platform === "win32") {
    return has("winget")
      ? {
          name: "winget",
          ffmpeg: "winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements",
          note: "Windows may show a window asking the person to allow the install.",
        }
      : null;
  }
  if (process.platform === "darwin") {
    // An app started from the Dock does not always know where Homebrew is.
    const brew = ["brew", "/opt/homebrew/bin/brew", "/usr/local/bin/brew"].find((b) => has(b));
    return brew ? { name: "Homebrew", ffmpeg: `${brew} install ffmpeg`, note: "" } : null;
  }
  const password = "It needs the computer's password. Never ask the person to tell you the password: they type it themselves if the app shows a prompt.";
  if (has("apt-get")) return { name: "apt", ffmpeg: "sudo apt-get install -y ffmpeg", note: password };
  if (has("dnf")) return { name: "dnf", ffmpeg: "sudo dnf install -y ffmpeg", note: password };
  if (has("pacman")) return { name: "pacman", ffmpeg: "sudo pacman -S --noconfirm ffmpeg", note: password };
  return null;
}

// Can this program reach the internet at all? (Asks OpenAI's front door, with
// no key. Any answer means yes. Instagram is never contacted here.)
async function internet() {
  try {
    await fetch("https://api.openai.com/v1/models", { signal: AbortSignal.timeout(10000) });
    return true;
  } catch {
    return false;
  }
}

// --- Claude Desktop -----------------------------------------------------------
// Where Claude Desktop keeps its settings on each system.
function claudeDesktopFolders() {
  const home = os.homedir();
  if (process.platform === "darwin") return [path.join(home, "Library", "Application Support", "Claude")];
  if (process.platform === "win32") {
    const places = [path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Claude")];
    // The version from the Microsoft Store keeps its settings somewhere else.
    const packages = path.join(process.env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "Packages");
    try {
      for (const dir of fs.readdirSync(packages)) {
        if (/claude/i.test(dir)) places.push(path.join(packages, dir, "LocalCache", "Roaming", "Claude"));
      }
    } catch {
      // no such folder: fine
    }
    return places;
  }
  return [path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), "Claude")];
}

function claudeDesktop() {
  const folder = claudeDesktopFolders().find((dir) => fs.existsSync(dir));
  if (!folder) return { installed: false };
  const file = path.join(folder, "claude_desktop_config.json");
  let config = {};
  let readable = true;
  if (fs.existsSync(file)) {
    try {
      config = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
    } catch {
      readable = false;
    }
  }
  const entry = config?.mcpServers?.[SERVER_NAME];
  const connected = !!entry && Array.isArray(entry.args) && entry.args.includes(TOOLBOX);
  return { installed: true, file, config, readable, connected, pointsElsewhere: !!entry && !connected };
}

function stamp() {
  const d = new Date();
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
}

function saveWithBackup(desktop, config) {
  let backup = null;
  if (fs.existsSync(desktop.file)) {
    backup = desktop.file.replace(/\.json$/, `.backup-${stamp()}.json`);
    fs.copyFileSync(desktop.file, backup);
  }
  fs.writeFileSync(desktop.file, JSON.stringify(config, null, 2) + "\n", "utf8");
  return backup;
}

const RESTART =
  "Now ask the person to quit Claude Desktop completely and open it again " +
  "(on Windows: right-click the Claude icon near the clock and choose Quit; on a Mac: Claude menu, Quit).";

function connect() {
  const desktop = claudeDesktop();
  if (!desktop.installed) return "Claude Desktop was not found on this computer. Nothing was changed.";
  if (!desktop.readable) {
    return `The settings file of Claude Desktop could not be understood, so it was left untouched: ${desktop.file}`;
  }
  if (desktop.connected) return "The toolbox is already connected to Claude Desktop. Nothing was changed.";
  const config = { ...desktop.config };
  config.mcpServers = {
    ...(config.mcpServers || {}),
    // The full address of Node.js, because an app started from the desktop
    // does not always know where programs are.
    [SERVER_NAME]: { command: process.execPath, args: [TOOLBOX] },
  };
  const backup = saveWithBackup(desktop, config);
  return [
    "Connected: the toolbox was added to the settings of Claude Desktop. Nothing else in that file was changed.",
    `Settings file: ${desktop.file}`,
    backup ? `Copy of the file as it was before: ${backup}` : "There was no settings file before, so a new one was made.",
    RESTART,
  ].join("\n");
}

function disconnect() {
  const desktop = claudeDesktop();
  if (!desktop.installed || !desktop.readable || !desktop.config?.mcpServers?.[SERVER_NAME]) {
    return "The toolbox is not in the settings of Claude Desktop. Nothing was changed.";
  }
  const config = { ...desktop.config, mcpServers: { ...desktop.config.mcpServers } };
  delete config.mcpServers[SERVER_NAME];
  const backup = saveWithBackup(desktop, config);
  return [`Disconnected. Copy of the file as it was before: ${backup}`, RESTART].join("\n");
}

// --- the key file ---------------------------------------------------------------
// The agent may MAKE the key file, with nothing in it but empty labels:
//   OPENAI_API_KEY=        always (needed to turn speech into text)
//   META_ACCESS_TOKEN=     only when the person wants the official Instagram route
// The person pastes each key after its "=" themselves. This program never
// prints what is inside the file and never writes a key. In a key file that
// already exists it changes nothing, except adding a label that is not there
// yet as a new empty line at the end.

function openInTextEditor(file) {
  if (process.env.VOICE_AGENT_NO_WINDOW) return Promise.resolve(false);
  const [program, args] =
    process.platform === "win32"
      ? ["notepad.exe", [file]]
      : process.platform === "darwin"
        ? ["open", ["-e", file]] // -e = the plain text editor (TextEdit)
        : ["xdg-open", [file]];
  return new Promise((resolve) => {
    try {
      const child = spawn(program, args, { detached: true, stdio: "ignore" });
      child.on("error", () => resolve(false));
      child.on("spawn", () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

async function makeKeyFile(options) {
  const withMeta = options.includes("meta");
  const justOpen = options.includes("open");
  const status = keyStatus();
  const wanted = [OPENAI_LABEL, ...(withMeta ? [META_LABEL] : [])];
  const hasValue = (label) => (label === OPENAI_LABEL ? status.hasKey : status.hasMeta);

  // The key file the tools use now (in this folder, or the one they found
  // above it). If there is none, a new one goes in this folder.
  const existing = status.file;
  const file = existing || path.join(AGENT_ROOT, ".env");
  let added = [];
  if (!existing) {
    fs.writeFileSync(file, wanted.map((l) => l + "=").join("\n") + "\n", { encoding: "utf8", flag: "wx" }); // wx = never overwrite
    added = wanted;
  } else {
    // Which labels are already there? Only the label names are looked at.
    const text = fs.readFileSync(file, "utf8");
    const missing = wanted.filter((l) => !new RegExp(`^\\s*(?:export\\s+)?${l}\\s*=`, "m").test(text));
    if (missing.length > 0) {
      const lineEnd = text.length > 0 && !/\n$/.test(text) ? "\n" : "";
      fs.appendFileSync(file, lineEnd + missing.map((l) => l + "=").join("\n") + "\n", "utf8");
      added = missing;
    }
  }

  const waiting = wanted.filter((l) => !hasValue(l));
  if (waiting.length === 0 && !justOpen) {
    return (
      "The keys asked for are already in place. Nothing was changed. To test them, run: node tools/run-tool.mjs check_setup. " +
      "(If the person wants to replace a key, run: node tools/setup.mjs key open)"
    );
  }
  if (waiting.length === 0) {
    // The person wants to replace a key themselves: only open the file.
    const shown = await openInTextEditor(file);
    return [
      shown
        ? "The key file is now open on the person's screen. Nothing in it was changed."
        : `The key file could not be opened in a window from here. Tell the person where it is: ${file}`,
      "Tell the person: replace the old key after the \"=\" with the new one, save, and close the window.",
      "You never type a key and never open this file to look. When they say it is done, run: node tools/run-tool.mjs check_setup",
    ].join("\n");
  }

  const opened = await openInTextEditor(file);
  const editor = process.platform === "win32" ? "Notepad" : process.platform === "darwin" ? "TextEdit" : "the text editor";
  const names = { [OPENAI_LABEL]: "OpenAI key", [META_LABEL]: "Meta key (access token)" };
  return [
    !existing
      ? `Made the key file with only empty labels in it: ${added.map((l) => l + "=").join("  ")}  (${file})`
      : added.length > 0
        ? `Added the empty label ${added.map((l) => l + "=").join("  ")} as a new line at the end of the key file. Nothing else in it was changed. (${file})`
        : `The key file is already there with its labels, still waiting for a key. It was not changed: ${file}`,
    opened
      ? `It is now open in ${editor} on the person's screen.`
      : `It could not be opened in a window from here. Tell the person where the file is and to open it with a plain text editor.`,
    `Tell the person, in plain words: ` +
      waiting.map((l) => `paste your ${names[l]} right after the "=" on the line ${l}=`).join("; ") +
      ` (no spaces, no quotes). Then save and close the window, and tell me it is done.`,
    waiting.includes(META_LABEL)
      ? `The Meta key is optional. How the person gets one: docs/official-instagram-route.md. If they do not want it after all, the empty line can simply stay.`
      : ``,
    `You never type a key, never ask for one, and never open this file to look. ` +
      `When they say it is done, run: node tools/run-tool.mjs check_setup`,
  ]
    .filter(Boolean)
    .join("\n");
}

// --- the report ---------------------------------------------------------------
async function report() {
  const online = await internet();
  const tool = installer();
  const key = keyStatus();
  const desktop = claudeDesktop();
  const checks = await runChecks();
  const lines = [];
  const next = [];

  lines.push("VOICE AGENT SETUP REPORT");
  lines.push(`System: ${systemName()} (${process.platform}, ${process.arch})`);
  lines.push(`Folder of the agent: ${AGENT_ROOT}`);
  lines.push(`Node.js: ${process.versions.node}, at ${process.execPath}`);

  lines.push(`Internet from here: ${online ? "yes" : "NO"}`);
  if (!online) {
    next.push(
      "Your commands run in a closed space inside the app, not on the person's computer, so nothing can be " +
        "installed or collected from here. Tell the person, in plain words: in this app the toolbox has to be " +
        "connected first. The way to do it: open this same folder in a part of the app (or another app) where " +
        "the assistant works directly on the computer, for example the Code tab of Claude Desktop, and say " +
        '"set up" there. After that it works here too. Do not hand them commands.'
    );
  }

  lines.push(`Program that installs programs: ${tool ? tool.name : "none found"}`);

  if (hasFfmpeg()) {
    lines.push("FFmpeg (optional helper): installed");
  } else {
    lines.push("FFmpeg (optional helper): not installed. The agent works without it for .mp4 files up to 24 MB.");
    if (online && tool) {
      next.push(
        `Optional: offer to install FFmpeg (faster, and handles big videos). If the person agrees, run: ${tool.ffmpeg}` +
          (tool.note ? `  (${tool.note})` : "") +
          " If it does not work, skip it: it is not needed."
      );
    }
  }

  const keyCheck = checks.find((c) => c.name.startsWith("The OpenAI key"));
  if (key.hasKey && online && keyCheck?.state === "problem") {
    lines.push(`OpenAI key: found, but it does not work (${keyCheck.detail})`);
    next.push(
      "The key file is there, but OpenAI did not accept the key. Tell the person in plain words, and ask them to " +
        "check the key in their key file and the credit of their OpenAI account (you never read that file). " +
        'See "The OpenAI key" in skills/setup/SKILL.md.'
    );
  } else if (key.hasKey) {
    lines.push("OpenAI key: found (tested below)");
  } else {
    lines.push(`OpenAI key: MISSING (${key.file ? "the key file is there, but the key has not been pasted in yet" : "there is no key file yet"})`);
    next.push(
      "The OpenAI key is missing. Run: node tools/setup.mjs key  (it makes the key file with only the empty label " +
        "and opens it on the person's screen). The person pastes the key themselves. You never read that file " +
        'and never type a key. Details: "The OpenAI key" in skills/setup/SKILL.md.'
    );
  }

  lines.push(
    key.hasMeta
      ? "Official Instagram route (optional): a Meta key is in the key file (tested below)"
      : "Official Instagram route (optional): not set up. The agent reads the public website. " +
          "Do not push it: mention it once as an option, and set it up only if the person wants it " +
          "(node tools/setup.mjs key meta, then docs/official-instagram-route.md)."
  );

  if (!online) {
    lines.push("Claude Desktop: cannot be seen from this closed space");
  } else if (!desktop.installed) {
    lines.push("Claude Desktop: not found on this computer (nothing to connect)");
  } else if (!desktop.readable) {
    lines.push(`Claude Desktop: installed, but its settings file could not be understood (${desktop.file})`);
    next.push(
      "Do not touch the settings file of Claude Desktop: it is damaged or in a form this helper does not know. " +
        "Tell the person that the toolbox could not be connected to Claude Desktop for that reason, and that " +
        "the agent still works in this app."
    );
  } else if (desktop.connected) {
    lines.push("Claude Desktop: installed, toolbox connected");
  } else {
    lines.push(
      `Claude Desktop: installed, toolbox NOT connected${desktop.pointsElsewhere ? " (an older entry points at another folder)" : ""}`
    );
    next.push(
      "Ask the person: \"May I connect the toolbox to Claude Desktop, so its Chat can also use the agent? " +
        'I add one entry to its settings and keep a copy of the file as it was." If yes, run: node tools/setup.mjs connect'
    );
  }

  lines.push("");
  lines.push("CHECKS");
  lines.push(describeChecks(checks));

  lines.push("");
  lines.push("NEXT STEPS FOR YOU, IN ORDER");
  if (next.length === 0) lines.push("Nothing left to set up. Tell the person the agent is ready and give two example requests.");
  next.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  return lines.join("\n");
}

const output =
  action === "connect"
    ? connect()
    : action === "disconnect"
      ? disconnect()
      : action === "key"
        ? await makeKeyFile(process.argv.slice(3))
        : action === "report"
          ? await report()
          : null;
if (output === null) {
  console.error(`Unknown action "${action}". Use: report, key, connect, disconnect.`);
  process.exitCode = 1;
} else {
  console.log(output);
}
