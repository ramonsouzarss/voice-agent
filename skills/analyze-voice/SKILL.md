---
name: analyze-voice
description: Analyzes the VOICE of an Instagram account from the transcripts of its videos, meaning the words and way of speaking that make it recognizable. Finds favorite words, signature phrases, how it addresses the audience, sentence length and rhythm, humor, strong language and cultural references. Use when someone says "voice", "tone of voice", "vocabulary", "how do they talk", "way of speaking", "signature phrases", "catchphrases", "wording", "language". Works on transcripts pasted in the chat OR on a workspace folder of transcripts.
---

# analyze-voice: how the account talks

In plain words: collect the **words and speaking habits** that make this
account sound like itself. The goal is a portrait of the voice that someone
else could imitate.

## Step 0: read the playbook first (always)
Read `.claude/skills/instagram-playbook/SKILL.md`, mainly "casual tone".
Spoken language, broken sentences and slang are choices, not mistakes.

## Step 1: gather the transcripts
- **Text pasted in the chat:** use it directly.
- **A folder:** read every transcript file (`.txt`), one file per video. The
  more transcripts, the better the portrait.
- **Skip thin transcripts** (fewer than 15 words) and say how many you skipped.

If it is not clear where the transcripts are, ask only that.

## Step 2: collect the language
Go through the transcripts and list, **with the exact words**:
- **Favorite words and everyday expressions.**
- **Signature phrases:** phrases that come back in several videos.
- **How it addresses people:** "you", "we", "guys"? And who is speaking: the
  brand, or individual people? Friend, teacher, guide, salesperson?
- **Sentences:** short and punchy, or long and flowing? What is the rhythm?
- **Humor and emphasis:** jokes, self-mockery, strong language, exaggeration.
- **References:** places, people, culture and trends it expects the audience
  to know.
- **Speaking habits:** repeated connectors and ways of starting a sentence.

## Step 3: find the patterns
- Which words and phrases form the account's **signature**?
- Are there fixed **opening or closing phrases**?
- Is the tone warm, playful, expert, inspirational? Is it the same in every
  video?
- What does the account **never** sound like?

A habit that appears once is an accident. A habit that appears in several
videos is part of the voice. Say how many videos each habit appears in.

## Step 4: check your work
Confirm that every quote appears word for word in a transcript.

## What to deliver
Save as `analysis-voice.md` in the account's workspace folder, with:

1. **Evidence:** transcripts used and skipped.
2. **The voice in short** (2 to 4 lines).
3. **Word list:** favorite words and signature phrases, with the videos where
   they appear.
4. **Who speaks to whom:** how the audience is addressed and the role taken.
5. **Sentences and rhythm,** with examples. Humor and emphasis.
6. **References** the account relies on.
7. **Voice guide:** do this, avoid this. Enough for someone to write a new
   script that sounds like the account.

Always based on real quotes. No general descriptions like "informal tone".
