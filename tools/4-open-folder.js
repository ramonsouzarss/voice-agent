// TOOL 4: open_folder
// Opens the folder of an account on the person's screen (Explorer on Windows,
// Finder on a Mac, the file manager on Linux), so they can drop their own
// video files into it. This is the way forward when Instagram refuses: the
// person brings the videos, the agent does the rest.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { cleanAccount, accountFolder, AGENT_ROOT } from "./lib/workspace.js";

// Starts the system's file manager and does not wait for it.
function showOnScreen(folder) {
  if (process.env.VOICE_AGENT_NO_WINDOW) return Promise.resolve(false);
  const [program, args] =
    process.platform === "win32"
      ? ["explorer.exe", [folder]]
      : process.platform === "darwin"
        ? ["open", [folder]]
        : ["xdg-open", [folder]];
  return new Promise((resolve) => {
    try {
      const child = spawn(program, args, { detached: true, stdio: "ignore" });
      child.on("error", () => resolve(false)); // no screen here (a server, a sandbox)
      child.on("spawn", () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

export default {
  name: "open_folder",
  title: "Open the folder of an account on the person's screen",

  description:
    "Opens the folder workspace/<account>/ in a window on the person's screen " +
    "(and creates the folder if it does not exist yet), so that the person can " +
    "drag their own files into it without having to find it. Use it when " +
    "Instagram refuses and the person chooses to bring the videos themselves, " +
    "and whenever the person asks where the files or results are. Any video " +
    "(.mp4, .mov, .webm) or sound recording (.mp3, .m4a, .wav) with any file " +
    "name is fine; transcribe_videos picks them up. It also reports what is in " +
    "the folder now. Called without an account, it opens the voice-agent folder " +
    "itself (used during setup, when the person has to save the key file " +
    "there). It never contacts Instagram.",

  inputSchema: {
    type: "object",
    properties: {
      account: {
        type: "string",
        description:
          "The Instagram account name. Example: intrepidtravel. Leave it out to open the voice-agent folder itself.",
      },
    },
  },

  async run({ account } = {}) {
    if (!account) {
      const opened = await showOnScreen(AGENT_ROOT);
      return [
        opened
          ? `A window with the voice-agent folder is now open on the person's screen.`
          : `The folder could not be opened in a window from here. Tell the person where it is instead.`,
        `Folder: ${AGENT_ROOT}`,
      ].join("\n");
    }
    const name = cleanAccount(account);
    const folder = accountFolder(name);
    fs.mkdirSync(folder, { recursive: true });
    const files = fs.readdirSync(folder);
    const media = files.filter((f) => /\.(mp4|mov|mkv|avi|webm|m4v|mp3|m4a|wav|ogg|aac|flac)$/i.test(f));
    const texts = files.filter((f) => /\.txt$/i.test(f));
    const opened = await showOnScreen(folder);
    return [
      opened
        ? `A window with the folder of @${name} is now open on the person's screen.`
        : `The folder could not be opened in a window from here. Tell the person where it is instead.`,
      `Folder: ${folder}`,
      `In it now: ${media.length} video or sound files, ${texts.length} transcripts.`,
      `Next: when the person says the files are in, call transcribe_videos with folder=${name}.`,
    ].join("\n");
  },
};
