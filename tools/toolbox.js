#!/usr/bin/env node
// THE TOOLBOX
// -----------------------------------------------------------------------------
// This small program is what gives the agent "hands".
// The AI model can only read and write text. It cannot open Instagram, download
// a video or listen to audio. So we hand it a toolbox: a list of tools, each
// with a NAME, a LABEL (the description) and a short FORM to fill in (the
// inputs). The model reads the labels, decides which tool fits the next step,
// fills in the form, and this program does the real work and reports back.
//
// The way the model and the toolbox talk to each other is a standard called
// MCP (Model Context Protocol). Think of it as the "USB plug" for AI tools:
// any agent app that speaks MCP can plug this toolbox in.
//
// This file has no outside dependencies on purpose, so you can read all of it.
// The tools live in their own files:
//   0-check-setup.js   (is this computer ready?)
//   1-list-videos.js   2-download-top-videos.js   3-transcribe-videos.js
//   4-open-folder.js   (show the person where to drop their own videos)
//
// IMPORTANT: this program runs on the person's own computer, with their
// internet connection. That is why the agent uses the tools through this
// toolbox instead of typing commands in its own protected space, which often
// has no road to Instagram or OpenAI.
// -----------------------------------------------------------------------------
import readline from "node:readline";

import checkSetup from "./0-check-setup.js";
import listVideos from "./1-list-videos.js";
import downloadTopVideos from "./2-download-top-videos.js";
import transcribeVideos from "./3-transcribe-videos.js";
import openFolder from "./4-open-folder.js";

export const TOOLS = [checkSetup, listVideos, downloadTopVideos, transcribeVideos, openFolder];

const SERVER_INFO = { name: "voice-agent-toolbox", version: "1.2.0" };
const DEFAULT_PROTOCOL = "2024-11-05";

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function callTool(name, args, progressToken) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `There is no tool called "${name}".` }],
    };
  }
  const notes = [];
  // Every line of the work log is also sent to the agent app right away, as a
  // "still working" sign. Apps that listen for it wait longer for the result.
  const note = (line) => {
    notes.push(line);
    if (progressToken !== undefined && progressToken !== null) {
      send({
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken, progress: notes.length, message: line },
      });
    }
  };
  try {
    const text = await tool.run(args || {}, note);
    const log = notes.length ? `\n\nWork log:\n- ${notes.join("\n- ")}` : "";
    return { content: [{ type: "text", text: text + log }] };
  } catch (err) {
    // A tool that fails must say so clearly. The agent reads this message and
    // decides what to do next (try again, try something else, or ask a human).
    const log = notes.length ? `\n\nWork log:\n- ${notes.join("\n- ")}` : "";
    return {
      isError: true,
      content: [{ type: "text", text: `The tool "${name}" failed: ${err.message}${log}` }],
    };
  }
}

async function handle(message) {
  const { id, method, params } = message;
  const expectsReply = id !== undefined && id !== null;

  if (method === "initialize") {
    return reply(id, {
      protocolVersion: params?.protocolVersion || DEFAULT_PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (method === "ping") return reply(id, {});
  if (method === "tools/list") {
    return reply(id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  }
  if (method === "tools/call") {
    return reply(id, await callTool(params?.name, params?.arguments, params?._meta?.progressToken));
  }
  // Notifications (messages without an id) need no answer.
  if (expectsReply) replyError(id, -32601, `Unknown method: ${method}`);
}

export function startServer() {
  const lines = readline.createInterface({ input: process.stdin });
  let pending = Promise.resolve();
  lines.on("line", (line) => {
    const text = line.trim();
    if (!text) return;
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return replyError(null, -32700, "Could not read the message (invalid JSON).");
    }
    pending = pending
      .then(() => handle(message))
      .catch((err) => {
        if (message?.id !== undefined) replyError(message.id, -32603, err.message);
      });
  });
  // The app hung up: finish the work in hand and let the program end by
  // itself (with a safety net in case something keeps it awake).
  lines.on("close", () =>
    pending.finally(() => {
      process.exitCode = 0;
      setTimeout(() => process.exit(0), 10000).unref();
    })
  );
  // Status messages go to stderr so they never mix with the conversation.
  console.error("Toolbox ready: " + TOOLS.map((t) => t.name).join(", "));
}

// Start only when this file is run directly (not when another file imports it).
import { fileURLToPath } from "node:url";
import path from "node:path";
// (Compared without caring about capital letters: on Windows "c:\" and "C:\"
// are the same place, and agent apps do not always write it the same way.)
const samePlace = (a, b) =>
  process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
if (process.argv[1] && samePlace(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  startServer();
}
