#!/usr/bin/env node
// PRE-FLIGHT CHECK, for a person in a terminal (the agent uses the tool
// check_setup instead, which runs the very same checks):
//
//   node tools/preflight.mjs
//
// It checks, on THIS computer, everything the agent depends on, and says in
// plain words what works and what to do if something does not. It makes no
// request to Instagram, so it is safe to run as often as you like.
import { TOOLS } from "./toolbox.js";
import { runChecks, describeChecks } from "./lib/checks.js";

console.log("\nPre-flight check for the Voice Agent\n");
console.log(`Tools in the toolbox: ${TOOLS.map((t) => t.name).join(", ")}\n`);

const results = await runChecks();
console.log(describeChecks(results) + "\n");
// (Set the result and let the program end by itself: stopping it abruptly
// right after talking to the internet makes some systems print a crash line.)
process.exitCode = results.some((r) => r.state === "problem") ? 1 : 0;
