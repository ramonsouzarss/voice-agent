// TOOL 0: check_setup
// Answers the question "is this computer ready to run the agent?".
// It looks for the programs and the key the other tools need, and reports in
// plain words. It never contacts Instagram and never shows the key.
import { runChecks, describeChecks } from "./lib/checks.js";

export default {
  name: "check_setup",
  title: "Check that the computer is ready",

  description:
    "Checks, on the person's own computer, everything the other tools need: " +
    "Node.js, FFmpeg, a working OpenAI key, and whether an Instagram pause is " +
    "active. It also lists the data already collected in the workspace. Use it " +
    "when the person asks if everything is installed or ready, and when another " +
    "tool complains about a missing program or key. It makes no request to " +
    "Instagram, so it is always safe to call. It tests the key without ever " +
    "showing it: never open the .env file to check the key yourself, this tool " +
    "is the way. It needs no inputs.",

  inputSchema: { type: "object", properties: {} },

  async run() {
    return describeChecks(await runChecks());
  },
};
