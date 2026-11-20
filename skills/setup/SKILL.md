---
name: setup
description: Sets up the Voice Agent on the person's computer (Windows, macOS or Linux) so that it is ready to use. Finds out which system this is, checks and installs what is missing (Node.js, optionally FFmpeg), guides the person to add their OpenAI key, connects the toolbox to the app when needed, and confirms that everything works. Use when the person says "set up", "setup", "/setup", "configure", "install", "get this ready", "prepare my computer", "is everything ready", in any language, or when they have just downloaded the folder and ask how to start.
---

# Setup: get this computer ready

In plain words: the person downloaded this folder and opened it in their AI
app. They are not technical. Your job is to make the agent ready **for them**:
you look, you install, you check. They only say yes or no, and they add their
own key.

## The rules of setup

- **You do the work.** Never hand the person a command to run.
- **Ask before you install or change anything.** One short question each time,
  in plain words: what it is, why it is needed, that it is free. Wait for yes.
- **Speak their language, without technical words.** Say "a free program
  called Node.js that runs the tools", not "runtime". No error codes.
- **Never read the key file** (`.env`, also when it is called `.env.txt`).
  You may put empty labels in it (`OPENAI_API_KEY=`, and `META_ACCESS_TOKEN=`
  if the person wants the official Instagram route), only through the setup
  helper. The person pastes the keys. You never open it to look and never
  type a key.
- **Never ask for a password.** If the computer asks for one, the person types
  it themselves in the window the app shows.
- **One step at a time.** After each step say in one line what happened.

Start by telling the person: "I will check this computer and set up what is
missing. It takes about five minutes. I will ask before I install anything."

## Step 1: is Node.js there?

Node.js is the free program that runs the tools. Run:

```
node --version
```

- **It prints a version of 18 or more:** go to step 2.
- **`node` is not found, or the version is below 18:** find out which system
  this is, ask the person if you may install Node.js, then install it.

  | System | How to know | How to install |
  | --- | --- | --- |
  | Windows | The folder path starts with a letter like `C:\`, or `ver` answers | `winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements` |
  | macOS | `uname -s` answers `Darwin` | If `brew --version` works: `brew install node` |
  | Linux (Ubuntu, Debian) | `uname -s` answers `Linux` | `sudo apt-get update` then `sudo apt-get install -y nodejs` |

  After installing, a command line that was already open may not see the new
  program yet. Try `node --version` again. On Windows, also try
  `"C:\Program Files\nodejs\node.exe" --version` and use that full name for
  the commands below if it works.

  **If you cannot install it** (no `winget`, no `brew`, a password is needed
  and the app cannot show the prompt, or the install fails twice): stop
  trying. Ask the person to install it the normal way: "Please open
  https://nodejs.org, press the green button that says LTS, and run the file
  it downloads like any other installer. Tell me when it is done." This is
  the one install they may have to do themselves.

## Step 2: look around

Run:

```
node tools/setup.mjs
```

It changes nothing. It reports the system, what is installed, whether the key
is there, whether Claude Desktop is connected, and it ends with **NEXT STEPS
FOR YOU, IN ORDER**. Those next steps are written for this exact computer.
Follow them one by one. The sections below explain each kind of step.

If the report says **"Internet from here: NO"**, your commands do not run on
the person's computer but in a closed space inside the app. You cannot set
anything up from here. Tell the person, in your own words:

> "In this part of the app I cannot reach your computer to set things up.
> Please open this same folder in the Code tab of Claude Desktop (or in
> another app where the assistant works directly on your computer), and say
> 'set up' there. It only has to be done once. After that I can work here too."

Then stop the setup. Analysing text the person pastes still works here.

## Step 3: FFmpeg (optional)

FFmpeg is a free helper that makes listening to videos faster and lets the
agent handle big videos. **The agent works without it.**

If the report offers it, ask: "There is an optional free helper that makes
transcribing faster. May I install it?" If yes, run the command the report
gives. If the person says no, or the install fails, skip it and move on. Do
not treat it as a problem.

## Step 4: the OpenAI key

The key lets the agent turn speech into text. It belongs to the person and it
is secret. **You make the file, they put the key in. You never see the key.**

If the report says the key is missing:

1. Run:

   ```
   node tools/setup.mjs key
   ```

   It makes the key file (`.env`) in this folder with one line in it, the
   empty label `OPENAI_API_KEY=`, and opens that file on the person's screen
   (Notepad on Windows, TextEdit on a Mac, the text editor on Linux). If a key
   file already exists it changes nothing and only opens it.

2. Tell the person, in their language:

   > "A small text file just opened on your screen. It has one line:
   > `OPENAI_API_KEY=`. Paste your OpenAI key right after the `=`, with no
   > spaces and no quotes. Save (Ctrl+S, or Cmd+S on a Mac) and close the
   > window. Tell me when it is done."

   If they do not have a key yet: "You get one at
   https://platform.openai.com, under API keys. It needs a little credit on
   the account. A whole job costs a few cents."

   If the helper says the file could not be opened in a window, call
   `open_folder` with no account so the folder opens, and tell them to open
   the file named `.env` with a plain text editor. On a Mac, files that
   start with a dot are hidden: in the Finder window they press
   Cmd+Shift+. (dot) to show them.

3. When they say it is done, run `node tools/run-tool.mjs check_setup`. It
   tests the key without showing it. If it says the key is missing or
   rejected, tell them in plain words and run `node tools/setup.mjs key`
   again so the file opens for them to fix.

What you never do, even to help: open the file to look, type a key into it,
ask the person to send you the key, or change a key file in any way other
than through `node tools/setup.mjs key`.

## Step 4b: the official Instagram route (optional, only if they want it)

The agent reads Instagram's public website, with no login. Some days
Instagram refuses visitors. There is an official door, made by Meta, that
does not refuse like that. It is optional and it takes real effort to set up.

Mention it **once**, in one or two sentences, and let the person decide:

> "One optional extra: Instagram sometimes refuses to show videos to
> visitors. There is an official route that avoids that. It needs a key from
> Meta, which takes about 20 minutes to make and must be renewed about every
> two months. You can skip it now and add it any time. Do you want it?"

- **If they say no or are not sure:** skip it. The agent is complete without
  it. Do not bring it up again unless Instagram refuses repeatedly.
- **If they say yes:**
  1. Run `node tools/setup.mjs key meta`. It puts the empty label
     `META_ACCESS_TOKEN=` in the key file (as a new line at the end if the
     file already exists, changing nothing else) and opens the file on their
     screen.
  2. Tell them how to get the key. Give them the short tutorial in the chat,
     in their language, as numbered steps: it is in `AGENTS.md` under "The
     Instagram key: the short tutorial". The full guide, with every step in
     detail, is `docs/official-instagram-route.md`: read it first, and use it
     when a step is unclear to them. It needs a professional Instagram
     account connected to a Facebook Page. If that sounds like too much for
     them, suggest asking a technical colleague, and skip for now.
  3. When they say the key is pasted and saved, run
     `node tools/run-tool.mjs check_setup`. It says whether Meta accepted the
     key and which Instagram account it belongs to. Never look in the file.
     If Meta refuses the key, the guide has a table "When something does not
     work": say what applies in plain words, and run
     `node tools/setup.mjs key open` so they can fix the key.

## Step 5: connect the toolbox to Claude Desktop

Only when the report says **"Claude Desktop: installed, toolbox NOT
connected"**. The Chat of Claude Desktop can only use the agent after this.

Ask: "May I connect the toolbox to Claude Desktop, so its Chat can also use
the agent? I add one entry to its settings and keep a copy of the file as it
was." If yes:

```
node tools/setup.mjs connect
```

Then pass on what it says: the person has to **quit Claude Desktop completely
and open it again**. (To undo it later: `node tools/setup.mjs disconnect`.)

In the other apps (Claude Code, Cursor, OpenCode, Antigravity, Codex) there
is nothing to connect: you run the tools yourself.

## Step 6: confirm and write it down

1. Run `node tools/setup.mjs` once more. When the next steps say nothing is
   left, setup is done. An Instagram pause is not a setup problem: mention it
   in one sentence and say what still works.
2. Add a line to `workspace/setup-log.md` (make the file if it is not there):
   the date, the system, what was installed or connected, what was skipped.
3. Tell the person, in five lines or fewer: that the agent is ready, what you
   installed, anything they still have to do (for example reopen Claude
   Desktop), and two things they can ask for now, for example:
   - "Make a voice profile for @account."
   - "Analyse the 5 most viewed videos of @account. Only hooks and retention."
