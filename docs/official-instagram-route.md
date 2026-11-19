# The official Instagram route (optional)

The Voice Agent normally reads Instagram the way any visitor does: the public
website, no login. Some days Instagram refuses visitors. If that keeps
happening and you want a lasting fix, there is a second door: the official
one, made by Meta (the company behind Instagram) for programs.

You do not need it to use the agent. It is an extra.

## What you get, and what you do not

| | Public website (default) | Official route |
| --- | --- | --- |
| Needs a key | No | Yes, a Meta key |
| Can be refused by Instagram | Yes, some days | No. It has fair, written limits instead |
| Which accounts it reads | Any public account | Only professional accounts (Business or Creator). Most brands are |
| Likes, comments, views | Yes | Yes |
| The video file | Yes | Usually. Not when the video uses licensed music, or its owner turned downloads off |
| Setup | None | About 20 minutes, once. The key must be renewed about every two months |

When a video has no file on the official route, the agent tells you which one
and gives you its link, so you can save that video yourself and drop it in
the folder.

## What you need before you start

1. An Instagram account that is a **professional account** (Business or
   Creator). In the Instagram app: Settings, Account type and tools, Switch to
   professional account. It is free.
2. That Instagram account **connected to a Facebook Page**. In the Instagram
   app: Edit profile, Page, Connect or create.
3. A free **Meta developer account**: https://developers.facebook.com

This part is the most technical thing in the whole agent. If your team has
someone who has made a "Meta app" before, ask them: it is a ten minute job
for them. Meta changes these screens from time to time, so the names below
may differ a little.

## Making the key

1. Go to https://developers.facebook.com, log in, and choose **My Apps**,
   then **Create App**. Choose the kind for business use and give it any
   name, for example "Voice Agent". You do not need to publish the app.
2. Open **Tools**, then **Graph API Explorer**.
3. Choose your new app in the list at the top right.
4. Under **Permissions**, add these four:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`
5. Press **Generate Access Token**. A window asks you to log in and to pick
   your Facebook Page and your Instagram account. Say yes to both.
6. The long text that appears in the "Access Token" box is a key that works
   for about an hour. To make it last about two months: open **Tools**, then
   **Access Token Debugger**, paste the key, press **Debug**, and then press
   **Extend Access Token** at the bottom. Copy the new, longer lasting key.

## Giving the key to the agent

Tell the agent: `I want to use the official Instagram route.`

The agent adds an empty line `META_ACCESS_TOKEN=` to your key file and opens
the file on your screen. You paste the key right after the `=`, save and
close. The agent never reads the key and never types it. Then it checks that
the key works and tells you which Instagram account it belongs to.

From then on the agent uses the official route by itself. If an account
cannot be read that way (it is not a professional account), the agent goes
back to the public website for that account.

## When the key stops working

After about two months Meta stops accepting the key. The agent will tell you
in plain words. Repeat steps 5 and 6 above, and replace the old key in the
key file with the new one (ask the agent to `open the key file`).

## Turning it off

Open the key file and empty the line, so that it reads `META_ACCESS_TOKEN=`
with nothing after it. The agent goes back to the public website.
