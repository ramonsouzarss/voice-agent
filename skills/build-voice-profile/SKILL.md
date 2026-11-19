---
name: build-voice-profile
description: Combines the four analyses of an Instagram account (hooks, retention, storytelling, voice) into ONE voice profile saved as a file. The voice profile is a practical guide with clear rules and real examples, made to be handed to an AI together with any text so the text can be rewritten in the voice of that account. Use when someone asks to "create the voice profile", "build the profile", "combine the analyses", "style guide for this account", "brand voice guide", or wants something reusable for writing in an account's style. Accepts finished analyses OR raw transcripts (then it makes the analyses first).
---

# build-voice-profile: one guide to the account's voice

In plain words: the four analysis skills each look at one side of the account.
This skill **puts them together** into a single guide and saves it as a file.

The voice profile is a **tool, not a report**. Later, someone will hand it to an
AI together with a plain text and say "rewrite this in this voice". So it must
be:
- **Made of rules** ("do this", "never do that"), not observations ("they tend
  to...").
- **Complete in itself.** It has to work when pasted into a brand new chat,
  with no access to the transcripts or the other files. Everything that matters
  must be inside it, with real examples.

## Step 0: read the playbook first (always)
Read `.claude/skills/instagram-playbook/SKILL.md`. The profile describes a
voice that works in a video feed, not in a formal document.

## Step 1: gather the material
- **Finished analyses** (the files `analysis-hooks.md`, `analysis-retention.md`,
  `analysis-storytelling.md`, `analysis-voice.md` in the account's workspace
  folder, or pasted in the chat): go to Step 2.
- **Only raw transcripts:** first do the four analyses yourself, following the
  method of each analysis skill, then go to Step 2.

The golden rule: **what repeats across videos is the voice. What appears once
is an accident.** Put repeated habits first. Leave out one-offs or label them
as one-offs.

If it is not clear what you received or where it is, ask only that.

## Step 2: combine (do not just stack)
- **No repeats.** The same habit often shows up in several analyses. Mention
  it once, in the section where it is strongest.
- **Signature first.** Lead with the few things that make this voice different
  from any other. This is a portrait, not an inventory.
- **Real quotes everywhere.** Every rule carries at least one quote, word for
  word, as an example to copy from.
- **Say what to avoid.** The words, tone and rhythm that would sound wrong for
  this account. This is what stops an AI from drifting into generic language.

## Step 3: check your work
Before saving:
- Every quote appears **word for word** in a transcript. Remove any that does
  not.
- Every rule is supported by **at least two videos**, or is labeled "seen
  once".
- The top of the file says how many videos the profile is based on.

## Step 4: save the file
Save as `voice-profile.md` in the account's workspace folder (or the name the
person asked for) and say where you saved it. Fill in **every** section of the
template. Short rules, written as instructions.

## The template (always use this structure)

```markdown
# Voice profile: <account>

> How to use: give this profile to an AI together with a text and ask it to
> rewrite the text in this voice. The profile is complete in itself.
> Based on: <N> videos (the most liked), transcripts only. <Any limits.>

## 1. The voice in short
2 to 4 lines: who it sounds like, who it talks to, with what energy.

## 2. Voice rules
The 5 to 8 rules that govern everything. Each one short, with its reason.
- **<Rule as an instruction>.** Why: <what it does for the viewer>.

## 3. Openings
The 2 to 4 opening templates the account repeats, each with a real example and
when to use it.
- **<Type of opening>.** Example: "<real quote>". Use when <situation>.

## 4. Words and tone
- **Tone:** <warm / playful / expert / ...>
- **Who speaks to whom:** how the audience is addressed, what role is taken.
- **Signature phrases:** "<quote>", "<quote>" (and where they usually appear).
- **Humor and emphasis:** what kind, with an example.
- **Avoid:** words and tones that do not fit this voice.

## 5. Story structure
The signature script shape (for example: doubt, then the trip with a named
guide, then the wider meaning). How named people and "you" are used. A real
example of what "specific" means in this voice.

## 6. Keeping attention and endings
The techniques it repeats, the usual ending or call to action, and the sentence
rhythm. Each with a real example.
- **Avoid (rhythm):** what breaks the flow of this voice.

## 7. Example bank
Real quotes grouped by purpose: openings / signature phrases / endings /
specific details / turning points. The more, the better.

## 8. How to apply this to a text
Step by step:
1. Replace the opening with one of the templates from section 3.
2. Add one or two signature phrases from section 4 where they fit naturally.
3. Reshape the text into the script shape from section 5.
4. Add the attention techniques and end in the style of section 6.
5. Go through every "Avoid" list and cut what does not fit.

### Final checklist
- [ ] Opens with a template from section 3?
- [ ] Uses at least one signature phrase from section 4?
- [ ] Right tone, and nothing from the "Avoid" lists?
- [ ] Follows the script shape from section 5?
- [ ] Ends in the style of section 6?
- [ ] Sounds like the quotes in the example bank?
```

## Final reminders
- **Rules, not observations:** "Open with a personal confession", not "they
  often open with confessions".
- **Complete in itself:** if a quote is needed to get the voice right, it has
  to be inside the profile.
- **Honest about limits:** the profile is built from words only. It does not
  know the images, the music or the editing.
