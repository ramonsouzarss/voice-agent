# The Instagram key (the official route)

The Voice Agent normally reads Instagram the way any visitor does: the public
website, no login. Some days Instagram refuses visitors, and then the agent
cannot collect the videos by itself.

There is a second door: the official one, made by Meta (the company behind
Instagram) for programs. To use it the agent needs a key from Meta. People
also call it an "Instagram API key" or an "access token". With the key in
place, the agent collects the list and the videos through the official door,
also while the website is refusing.

You do not need it to use the agent. It is an extra, and it is free.

## The short version

1. **Check two things on Instagram.** Your own Instagram account is a
   professional account (Business or Creator), and it is connected to a
   Facebook Page that you manage.
2. **Make a Meta app.** Go to https://developers.facebook.com, log in with
   the Facebook account that manages that Page, choose **My Apps**, then
   **Create App**. If it asks for a use case choose **Other**, and for the
   type choose **Business**. Any name is fine.
3. **Make the key.** Open https://developers.facebook.com/tools/explorer.
   Choose your app at the top right. Add the four permissions
   `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
   and `pages_show_list`. Press **Generate Access Token** and say yes to your
   Page and your Instagram account.
4. **Make it last two months.** Open
   https://developers.facebook.com/tools/debug/accesstoken, paste the key,
   press **Debug**, then **Extend Access Token**. Copy the new key.
5. **Give it to the agent.** Say `I want to add my Instagram key`. A small
   text file opens on your screen with the line `META_ACCESS_TOKEN=`. Paste
   the key right after the `=`, with no spaces and no quotes. Save and close.
6. **Say `done`.** The agent checks the key and tells you which Instagram
   account it belongs to. From then on it uses the official door by itself.

The rest of this page explains each step, and what to do when something does
not work.

## What you get, and what you do not

| | Public website (default) | Official route |
| --- | --- | --- |
| Needs a key | No | Yes, a Meta key |
| Can be refused by Instagram | Yes, some days | No. It has fair, written limits instead |
| Which accounts it reads | Any public account | Only professional accounts (Business or Creator). Most brands and creators are |
| Likes, comments, views | Yes | Yes |
| The video file | Yes | Only for part of the videos. Not when the video uses licensed music, or its owner turned downloads off |
| Setup | None | About 20 minutes, once. The key must be renewed about every two months |

Two things to know before you spend the 20 minutes:

- **The key is yours, the videos are theirs.** The key belongs to *your*
  Instagram account. With it the agent can read the public videos of *other*
  professional accounts. It cannot read a personal account, a private
  account or an account with an age limit. For those, the agent goes back to
  the public website.
- **Many videos come without their file.** When a video uses music from
  Instagram's library, or its owner turned downloads off, Meta gives the
  numbers (likes, views, comments) but not the file. For an account that
  uses a lot of popular music this can be more than half of the videos, and
  most of the top ones. The list with the numbers is always complete. For
  the videos without a file, the agent tells you which they are and asks
  what you prefer: work with the most liked videos that do come with a file,
  or save the missing ones yourself and drop them in the folder.

## What you need before you start

1. An Instagram account that is a **professional account** (Business or
   Creator). In the Instagram app: Settings, Account type and tools, Switch to
   professional account. It is free.
2. That Instagram account **connected to a Facebook Page** that you manage.
   In the Instagram app: Edit profile, Page, Connect or create.
3. A free **Meta developer account**: https://developers.facebook.com. Log in
   with the Facebook account that manages the Page.

This part is the most technical thing in the whole agent. If your team has
someone who has made a "Meta app" before, ask them: it is a ten minute job
for them. Meta changes these screens from time to time, so the names below
may differ a little.

## Making the key, step by step

1. Go to https://developers.facebook.com, log in, and choose **My Apps**,
   then **Create App**. Give it any name, for example "Voice Agent", and your
   email address. If it asks for a use case, choose **Other**. If it asks for
   an app type, choose **Business**. If it asks to connect a business, you
   can skip that. You do not need to publish the app or send it for review.
2. Open **Tools**, then **Graph API Explorer**
   (https://developers.facebook.com/tools/explorer).
3. On the right side of the page, under **Meta App**, choose your new app.
   Under **User or Page**, choose **User Token**.
4. Under **Permissions**, there is a small box that says **Add a
   permission**. Type the name of each permission there and click it in the
   list that appears. Add these four:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`

   If your Facebook Page is managed through a business portfolio (Meta
   Business Suite), add a fifth one: `ads_read`.
5. Press **Generate Access Token**. A window asks you to log in and to pick
   your Facebook Page and your Instagram account. Do not just press
   "Continue": look for the choice of Pages and accounts, and tick both your
   Page and your Instagram account. A key made without ticking them works,
   but sees nothing.
6. The long text that appears in the "Access Token" box is a key that works
   for about an hour. To make it last about two months: open **Tools**, then
   **Access Token Debugger**
   (https://developers.facebook.com/tools/debug/accesstoken), paste the key,
   press **Debug**, and then press **Extend Access Token** at the bottom.
   Copy the new, longer lasting key.

### Check the key before you copy it

You can test the key right there in the Graph API Explorer, before you take
it to the agent. In the long box at the top of the page, replace what is
written with `me/accounts` and press the blue button **Submit**.

- **You see the name of your Page** in the answer: the key is good. Go on to
  step 6.
- **You see an empty answer**, like `"data": [ ]`: the key does not see your
  Page. Press **Generate Access Token** again and, in the window that opens,
  tick your Page and your Instagram account. If the window does not offer
  your Page, add the permissions `ads_read` and `business_management` in
  step 4 and try once more.

### The names on the screen

Meta shows these screens in the language of your Facebook account, so the
names may not be in English. Some buttons stay in English in every language.
In Portuguese, for example:

| In this guide | On a screen in Portuguese |
| --- | --- |
| My Apps | Meus apps |
| Tools | Ferramentas |
| Graph API Explorer | Explorador da Graph API |
| Access Token | Token de acesso |
| Generate Access Token | Generate Access Token (stays in English) |
| Meta App | App da Meta |
| User or Page | Usuário ou Página |
| User Token | Token do usuário |
| Permissions | Permissions (the tab) and Permissões (the list) |
| Add a permission | Adicionar uma permissão |
| Submit | Enviar |

Make the key in the **Graph API Explorer**, as described here. The page of
your app that is called "Instagram" (API setup with Instagram login) also
makes keys, but those are a different kind and the agent cannot use them.

## Giving the key to the agent

Tell the agent: `I want to add my Instagram key.`

The agent adds an empty line `META_ACCESS_TOKEN=` to your key file (the same
small file that holds your OpenAI key) and opens the file on your screen. You
paste the key right after the `=`, with no spaces and no quotes, then save
and close. The agent never reads the key and never types it.

Then say `done`. The agent checks that Meta accepts the key and tells you
which Instagram account it belongs to.

From then on the agent uses the official route by itself, also on days when
the website refuses. If an account cannot be read that way (it is not a
professional account), the agent goes back to the public website for that
account.

## When something does not work

| What the agent tells you | What to do |
| --- | --- |
| Meta did not accept the key | The key is older than two months, was copied only in part, or is the wrong kind. Make a new one (steps 5 and 6 above) and replace the old one in the key file |
| The key does not have the needed permissions | Go back to step 4, add the permissions that are missing, and press **Generate Access Token** again |
| The key works, but it does not see any Facebook Page | In step 5, the window lets you choose which Pages the key may see: press **Generate Access Token** again and tick your Page and your Instagram account. If you have no Facebook Page yet, make one and connect your Instagram account to it first. If your Page is managed through a business portfolio (Meta Business Suite), also add the permissions `ads_read` and `business_management` in step 4 |
| The key sees your Page, but no professional Instagram account | Your Instagram account is not a professional account yet, or it is not connected to that Page (see "What you need before you start"). Then press **Generate Access Token** again and tick the Instagram account too |
| The official route cannot read this account | That account is personal, private or age-restricted. The agent tries the public website for it, or you bring the videos yourself |
| Some videos come without their file | Licensed music, or downloads turned off by the owner. Tell the agent to use the most liked videos that do come with a file, or save the missing videos yourself and drop them in the folder of the account |
| You pasted the key, and the agent still says there is no key | Check that you saved the file (Ctrl+S, or Cmd+S on a Mac) and that the key is on the line `META_ACCESS_TOKEN=`, right after the `=`. Then ask the agent to check again |
| Meta asks to wait | Meta's limit for the hour was reached. Try again in an hour |

## When the key stops working

After about two months Meta stops accepting the key. The agent will tell you
in plain words. Repeat steps 5 and 6 above, and replace the old key in the
key file with the new one (ask the agent to `open the key file`).

## Turning it off

Open the key file and empty the line, so that it reads `META_ACCESS_TOKEN=`
with nothing after it. The agent goes back to the public website.

## Where Meta explains this

For the curious, or for a technical colleague. Meta has three ways to connect
to Instagram. The agent uses the one called "Instagram API with Facebook
Login", and from it only the part called "Business Discovery", which reads
the public posts of professional accounts.

- The Instagram Platform, overview:
  https://developers.facebook.com/documentation/instagram-platform
- Getting started with Facebook Login:
  https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/get-started
- Business Discovery:
  https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery
