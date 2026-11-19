# Voice Agent

An AI agent that studies how a public Instagram account communicates in its
videos and writes a **voice profile**: a guide that lets you write new text in
the voice of that account.

It is made for communication and marketing people. You talk to it in normal
sentences. You never need a terminal.

## Start here

1. **Download this folder.** On the GitHub page press the green **Code**
   button, then **Download ZIP**, and unzip it where you keep your documents.
2. **Open the folder in your AI app.** It works with Claude Desktop, Claude
   Code, Cursor, OpenCode, Antigravity, Codex and other apps that can open a
   folder, on Windows, macOS and Linux.
3. **Say `set up`** (or type `/setup`). The agent looks at your computer,
   installs what is missing after asking you, shows you where to put your
   OpenAI key, and tells you when everything is ready.
4. **Say what you want.** Examples:
   - `Make a voice profile for @intrepidtravel.`
   - `Analyse the 5 most viewed videos of @visitcopenhagen. Only hooks and retention.`
   - `Open the folder of @intrepidtravel.`
   - `Continue the job of @intrepidtravel.`

The agent writes its own checklist, collects the videos, writes down what is
said in them, does the analyses and tells you where the result is. You can
write to it in your own language.

If your app does not read the instructions by itself, make this the first
message of the chat: `Read AGENTS.md and follow it.`

## What setup does for you

| What | Why | Who does it |
| --- | --- | --- |
| Finds out which system you have | Windows, macOS and Linux install things differently | The agent |
| Node.js | The free program that runs the tools | The agent installs it after you say yes. If it cannot, it asks you to use the normal installer from https://nodejs.org |
| FFmpeg (optional) | Makes listening faster and handles big videos | The agent offers it. Without it the agent still works with `.mp4` files up to 24 MB |
| Your OpenAI key | It turns speech into text | The agent makes a small file with the line `OPENAI_API_KEY=` and opens it on your screen. **You** paste your key after the `=` and save. The agent never reads it |
| A Meta key (optional) | Opens the official Instagram route, which is not refused like the website | Only if you want it. The agent adds the line `META_ACCESS_TOKEN=` to the same file; you make the key at Meta and paste it. See `docs/official-instagram-route.md` |
| The toolbox in Claude Desktop | So the Chat of Claude Desktop can use the agent too | The agent, after you say yes. Then you close and reopen Claude Desktop |
| A final check | To know that everything really works | The agent |

One thing to know about **Claude Desktop**: its Chat cannot reach your
computer by itself. Do the setup once in its **Code** tab (same folder, say
`set up`). After that the Chat works too.

## When Instagram says no

Instagram decides who may look at a profile without logging in, and some days
it refuses. This agent never logs in, so on those days it cannot collect the
videos by itself. **Your job is never stuck.** The agent stops, tells you
until when Instagram is closed for it, and offers you these ways forward:

1. **Use what is already collected.** If the account has videos from an
   earlier job, the agent works with those.
2. **Bring the videos yourself.** The agent opens the folder of the account on
   your screen. You drop the video files in and say "done". Any file name
   works. To choose the videos, look at the Reels tab of the profile: it shows
   the views of each video. To get a file, use Instagram's own download or
   save option when the account allows it, record your screen with sound
   while the video plays, or ask the team that owns the account.
3. **Paste the words.** If you have the text of what is said in the videos,
   paste it in the chat.
4. **Wait.** The agent notes the time in the job. Later you say "continue".
5. **Try from another internet connection.** If you move to another network
   (home, another office, a phone hotspot), tell the agent. It may try once.

6. **Set up the official Instagram route** (optional, a lasting fix). Meta,
   the company behind Instagram, has an official door for programs that does
   not refuse like the website does. It needs a key that you make once at
   Meta (about 20 minutes) and renew about every two months, and it reads
   only professional accounts, which most brands are. Tell the agent
   `I want to use the official Instagram route`. The guide is in
   `docs/official-instagram-route.md`.

What the agent will not do: log in to Instagram, use download websites, or
keep trying during a refusal. Trying again and again is what turns a short
refusal into a long one.

## The agent in one picture

```
                         THE PERSON (gives the goal, checks the result)
                                          |
                                          v
   +---------------------------------------------------------------------+
   |                              THE AGENT                              |
   |                                                                     |
   |   INSTRUCTIONS        BRAIN (the AI model)         PLAN             |
   |   AGENTS.md      <->  reads, decides, writes  <->  jobs/<account>.md|
   |                              |                                      |
   |          +-------------------+-------------------+                  |
   |          v                   v                   v                  |
   |      TOOLS               KNOWLEDGE + SKILLS    MEMORY               |
   |      tools/              skills/               workspace/<account>/ |
   |      (hands)             (training)            (notebook)           |
   +---------------------------------------------------------------------+
          |
          v
   Instagram, video files, speech to text
```

## The parts, one by one

| Part | Think of it as | In this folder | What happens without it |
| --- | --- | --- | --- |
| Brain | A smart new colleague | The AI model inside the agent app | Nothing happens at all |
| Instructions | The job description | `AGENTS.md` | The colleague is smart but does not know the job or the house rules |
| Tools | Hands and equipment | `tools/` (5 tools, plus the setup helper) | It can only talk. It cannot fetch, download or listen |
| Knowledge | The training manual | `skills/instagram-playbook/` | It judges videos like school essays |
| Skills | Step by step procedures | `skills/analyze-*` and `skills/build-voice-profile` | A different method and a different result every time |
| Plan | Today's checklist | `jobs/<account>.md` (the agent copies it from `jobs/job-card-template.md`) | It does one step and waits, or does steps in the wrong order |
| Memory | The notebook and the filing cabinet | `workspace/<account>/` | It forgets everything when the chat ends |
| The loop | The work routine | Decide, act, look at the result, repeat | It answers once and stops |
| The person | The manager | You | Nobody sets the goal or checks the work |

## The tools

| Tool | What it does | What it leaves in the workspace |
| --- | --- | --- |
| `check_setup` | Checks that the computer has what the agent needs and whether Instagram is paused | nothing |
| `list_videos` | Lists the recent videos of a public account with likes, views, comments | `videos.csv` (opens in Excel) |
| `download_top_videos` | Downloads the top videos, ranked by likes or by views | `1_xxxx.mp4`, `2_xxxx.mp4`, ... |
| `transcribe_videos` | Writes down what is said in each video or sound file in the folder | a `.txt` next to each file |
| `open_folder` | Opens the folder of an account on your screen | nothing |

## The six skills

| Skill | Question it answers | File it writes |
| --- | --- | --- |
| `instagram-playbook` | What makes a short video work? (background knowledge) | none |
| `analyze-hooks` | How do they open their videos? | `analysis-hooks.md` |
| `analyze-retention` | What keeps people watching, and how do they end? | `analysis-retention.md` |
| `analyze-storytelling` | How do they build a story? | `analysis-storytelling.md` |
| `analyze-voice` | What words and tone make them recognizable? | `analysis-voice.md` |
| `build-voice-profile` | How do I write like them? | `voice-profile.md` |

You can use any single part by itself, for example:
`Use the analyze-hooks skill on workspace/<account>/`

## Good to know

- The tools read only what any visitor can see on a public profile. No login.
- The tools are gentle with Instagram on purpose: they read 5 pages unless told
  otherwise, wait a few seconds between requests, and reuse a list collected
  in the last 6 hours.
- When Instagram refuses, the tools write a note
  (`workspace/instagram-pause.json`) so nothing contacts Instagram again for a
  while: 30 minutes the first time, then 2 hours, 6 hours and a day if it keeps
  refusing. Do not delete that note to try sooner. The agent is not allowed to
  delete it either.
- `download_top_videos` and `transcribe_videos` work in short turns of about
  a minute, so the app never gives up waiting. The agent calls them again
  until the batch is done.
- The agent only knows the **words** of a video. It does not see images or
  hear music.
- The agent never reads the keys in the `.env` file. The only thing it may
  do is put empty labels in that file for you: `OPENAI_API_KEY=` always, and
  `META_ACCESS_TOKEN=` if you want the official Instagram route. You paste
  the keys yourself. It never edits or
  deletes a key file that is already there, and if the key is missing or
  wrong it asks you to fix it.

## For the curious: what is inside

A tool is just a small program, and the agent starts them for you. If you
want to see them work without any AI, open a terminal in this folder:

```
node tools/setup.mjs
node tools/run-tool.mjs
node tools/run-tool.mjs list_videos account=<account> maxPages=1
```

The first line is what the agent runs during setup: it looks at the computer
and reports, and changes nothing. Nobody needs to do this to use the agent.

The `/setup` command exists in several small files (`.claude/`, `.cursor/`,
`.agents/`, `.opencode/`, `.gemini/`) because each app looks for commands in
its own place. They all point at the same method: `skills/setup/SKILL.md`.
