# Job card: voice profile for {{ACCOUNT}}

> How to use this template: you do not have to. Just tell the agent what you
> want in a normal sentence, for example "Analyse the 5 most viewed videos of
> @intrepidtravel, only hooks and retention". The agent copies this template
> to `jobs/<account>.md`, fills it in and starts.
> (By hand: copy this file, name it `<account>.md`, replace `{{ACCOUNT}}`
> everywhere with the account name without the @, then say
> "Run the job card jobs/<account>.md".)

**Goal:** deliver `workspace/{{ACCOUNT}}/voice-profile.md`
**Account:** @{{ACCOUNT}}
**How many videos:** 10
**Ranked by:** likes (the other choice is views)

## Checklist

### Phase 1: collect (the tools do this, the agent runs them)

- [ ] Make the list of videos of @{{ACCOUNT}} with the tool `list_videos`
- [ ] Download the top 10 videos with the tool `download_top_videos` (count=10, by=likes). If it says CALL AGAIN, call it again until it says Done
- [ ] Turn the videos into text with the tool `transcribe_videos`. If it says CALL AGAIN, call it again until it says Done
- [ ] Count the usable transcripts (15 words or more). If fewer than 5, stop and ask the person what to do

> If Instagram refuses during this phase, the job is not stuck. Offer the
> person the ways forward from AGENTS.md ("When Instagram refuses") and write
> here which one they chose. Videos the person brings themselves, or text they
> paste, count the same as collected ones.
>
> If the list came through the official Instagram route and some of the top
> videos have no file, ask the person how to complete the set (AGENTS.md,
> "When the official route is set up") and write here which positions of the
> ranking were used in the end.

### Phase 2: understand (the skills do this)

- [ ] Run the skill `analyze-hooks` on `workspace/{{ACCOUNT}}/` and save `analysis-hooks.md`
- [ ] Run the skill `analyze-retention` on `workspace/{{ACCOUNT}}/` and save `analysis-retention.md`
- [ ] Run the skill `analyze-storytelling` on `workspace/{{ACCOUNT}}/` and save `analysis-storytelling.md`
- [ ] Run the skill `analyze-voice` on `workspace/{{ACCOUNT}}/` and save `analysis-voice.md`

### Phase 3: deliver

- [ ] Run the skill `build-voice-profile` on the four analyses and save `voice-profile.md`

### Phase 4: check (before a human reads it)

- [ ] Open `voice-profile.md` and confirm that every quote appears word for word in a transcript. Fix or remove any that does not
- [ ] Write the final summary for the person: where the profile is, how many videos it is based on, what went wrong, what to double check
