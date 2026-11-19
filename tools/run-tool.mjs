#!/usr/bin/env node
// Run one tool by hand, without any AI. Useful to show that a tool is just a
// small program, and to test the tools before class.
//
//   node tools/run-tool.mjs                      (shows the tools and their labels)
//   node tools/run-tool.mjs check_setup
//   node tools/run-tool.mjs list_videos account=intrepidtravel maxPages=1
//   node tools/run-tool.mjs download_top_videos account=intrepidtravel count=3 by=views
//   node tools/run-tool.mjs transcribe_videos folder=_practice-videos
//   node tools/run-tool.mjs open_folder account=intrepidtravel
import { TOOLS } from "./toolbox.js";

const [toolName, ...pairs] = process.argv.slice(2);

if (!toolName) {
  console.log("Tools in the toolbox:\n");
  for (const t of TOOLS) {
    console.log(`  ${t.name}`);
    console.log(`    ${t.description}\n`);
  }
  process.exit(0);
}

const tool = TOOLS.find((t) => t.name === toolName);
if (!tool) {
  console.error(`No tool called "${toolName}". Available: ${TOOLS.map((t) => t.name).join(", ")}`);
  process.exit(1);
}

const args = {};
for (const pair of pairs) {
  const i = pair.indexOf("=");
  if (i < 0) continue;
  const key = pair.slice(0, i);
  let value = pair.slice(i + 1);
  if (value === "true") value = true;
  else if (value === "false") value = false;
  else if (/^\d+$/.test(value)) value = Number(value);
  args[key] = value;
}

try {
  const text = await tool.run(args, (line) => console.log("  . " + line));
  console.log("\n" + text);
} catch (err) {
  console.error("\nFAILED: " + err.message);
  process.exitCode = 1;
}
