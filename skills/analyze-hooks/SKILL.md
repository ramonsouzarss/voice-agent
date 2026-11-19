---
name: analyze-hooks
description: Analyzes the HOOKS (the first seconds, the opening lines) of an Instagram account's videos from their transcripts. Names the type of each hook, explains why it stops the scroll and finds the opening patterns the account repeats. Use when someone says "hooks", "openings", "first lines", "first seconds", "how do they start their videos". Works on transcripts pasted in the chat OR on a workspace folder of transcripts.
---

# analyze-hooks: how the account opens its videos

In plain words: look only at the **beginning** of each video, the line that
decides whether a person stops scrolling. The goal is to find the account's
**opening style** (what it repeats), not to review one single video.

## Step 0: read the playbook first (always)
Read `.claude/skills/instagram-playbook/SKILL.md`. Judge every hook with one
question: "does this stop the scroll in the first seconds?"

## Step 1: gather the transcripts
- **Text pasted in the chat:** use it directly.
- **A folder** (for example `workspace/intrepidtravel/`): read every transcript
  file (`.txt`). Ignore videos and other files. One file is one video.
- **Skip thin transcripts:** fewer than 15 words usually means music only.
  Leave them out and say how many you skipped.

If it is not clear where the transcripts are, ask only that.

## Step 2: isolate the hook of each video
Take only the opening: the first sentence, or the first two if they belong
together. Copy it **word for word**.

## Step 3: name the type of each hook
Common types (use these, add a new one if you see it):
- **Bold or surprising statement:** goes against what people expect.
- **Specific number or fact:** a concrete promise ("7 days", "my 6-year-old").
- **Direct question:** hands the doubt to the viewer.
- **Promise or announced list:** "here is exactly what we did".
- **Scene without context:** starts in the middle of something.
- **"This is you":** mirrors a fear, wish or situation of the viewer.
- **Series marker or signature phrase:** the same opening every time.
- **Confession:** admits a doubt, a fear or a mistake.

For each hook give: the exact words, the type, and one or two lines on **why it
stops the scroll**.

## Step 4: find the patterns
Looking at all the hooks together:
- Which **types** does the account use most? (give counts)
- Are there **opening formulas** (same sentence shape, same kind of number)?
- Does it start at the most interesting point, or does it warm up first?
- Who is speaking: the brand ("we") or a person ("I")?
- What is the **signature opening** of this account?

## Step 5: check your work
Before you finish, confirm that every quote appears word for word in a
transcript. Remove or fix any quote that does not.

## What to deliver
Save the result as `analysis-hooks.md` in the account's workspace folder (or
answer in the chat if the transcripts were pasted). Use these sections:

1. **Evidence:** how many transcripts were used and how many were skipped.
2. **The opening style in short** (2 to 4 lines).
3. **Hook by hook:** a table with video, exact opening words, type, why it works.
4. **Patterns:** most used types and repeated formulas, with examples.
5. **Weak spots:** openings that are slow or generic, and why.
6. **Reusable templates:** 2 to 4 fill-in-the-blank openings taken from the
   account's own hooks.

Be specific and always quote the real words. No general advice like "write a
strong hook".
