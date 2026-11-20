// Talking to Instagram's public website (no login, no password, no cookies of
// a real user). We only read what any visitor can see on a public profile.
//
// How it works, in plain words:
//   1. Open the public profile page, like a visitor would.
//   2. Ask for the posts of that profile, page by page, the same way the
//      website does when you scroll down.
//   3. Keep only the videos and write down their numbers (likes, views...).
//
// GOOD MANNERS (this is what keeps us from being blocked):
//   - We ask for as little as possible, and never the same thing twice.
//   - We wait a few seconds between requests, like a person scrolling.
//   - When Instagram refuses, we STOP. We write down a pause and do not contact
//     Instagram again until the pause is over. Each refusal in a row makes the
//     next pause longer (30 minutes, 2 hours, 6 hours, a day). Insisting during
//     a block is what turns a short block into a long one.
//   - We never look for "another way in". If Instagram wants visitors to log
//     in, the honest answer is: not today, from this connection.
import { promises as fs, createWriteStream, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { sleep, WORKSPACE } from "./workspace.js";
import { getMetaToken } from "./settings.js";

const WEB_APP_ID = "936619743392459";
const PAGE_SIZE = 12;

// Seconds to wait between two requests to Instagram (a random value in this
// range, so the rhythm is not mechanical). Change with IG_MIN_GAP / IG_MAX_GAP.
const MIN_GAP_MS = Number(process.env.IG_MIN_GAP ?? 2) * 1000;
const MAX_GAP_MS = Number(process.env.IG_MAX_GAP ?? 4) * 1000;

// How long we stay away after Instagram refuses us (minutes): the first
// refusal, the second in a row, the third, and every one after that.
const PAUSE_LADDER_MINUTES = [Number(process.env.IG_PAUSE_MINUTES || 30), 120, 360, 1440];
// A refusal older than this no longer counts as "in a row".
const FORGET_REFUSALS_AFTER_MS = 48 * 3600 * 1000;

// Internal id of the "posts of a profile" request. Instagram rotates it from
// time to time; if it stops working we look up the current one automatically.
const DEFAULT_POSTS_DOC_ID = process.env.IG_POSTS_DOC_ID || "27964987773089789";
// Internal id of the "one post" request (used to find the video file).
const SHORTCODE_DOC_ID = process.env.IG_SHORTCODE_DOC_ID || "10015901848480474";

const POSTS_FRIENDLY_NAME =
  "PolarisProfilePostsTabContentQuery_connection_" +
  "xdt_api__v1__feed__user_timeline_graphql_connection";

const PROVIDER_FLAGS = [
  "__relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider",
  "__relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider",
  "__relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider",
  "__relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider",
  "__relay_internal__pv__PolarisImmersiveFeedChainingEnabledrelayprovider",
  "__relay_internal__pv__PolarisAIGMAccountLabelEnabledrelayprovider",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "x-ig-app-id": WEB_APP_ID,
  "X-Requested-With": "XMLHttpRequest",
};

// ---------------------------------------------------------------------------
// The pause: a small note in the workspace that says "stay away until ...".
// Every tool reads it before contacting Instagram.
// ---------------------------------------------------------------------------
const PAUSE_FILE = path.join(WORKSPACE, "instagram-pause.json");

export class InstagramPause extends Error {
  constructor(message, until) {
    super(message);
    this.name = "InstagramPause";
    this.paused = true;
    this.until = until;
  }
}

// "14:30" for today, "Fri 20 Nov, 14:30" for another day.
function clock(ms) {
  const when = new Date(ms);
  const two = (n) => String(n).padStart(2, "0");
  const time = `${two(when.getHours())}:${two(when.getMinutes())}`;
  if (when.toDateString() === new Date().toDateString()) return time;
  const day = when.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}

// The note as it is on disk, even when its pause is over (or null).
function readNote() {
  try {
    if (!existsSync(PAUSE_FILE)) return null;
    return JSON.parse(readFileSync(PAUSE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeNote(note) {
  try {
    mkdirSync(WORKSPACE, { recursive: true });
    writeFileSync(PAUSE_FILE, JSON.stringify(note, null, 2), "utf8");
  } catch {
    // if the note cannot be written we still stop this run
  }
}

// Returns the note while a pause is active, otherwise null.
export function currentPause() {
  const note = readNote();
  return note && note.until && Date.now() < note.until ? note : null;
}

// What we know about Instagram without contacting it (for check_setup).
export function instagramStatus() {
  const note = readNote();
  return { pause: currentPause(), lastOk: note?.lastOk || null, refusals: note?.refusals || 0 };
}

export function pauseMessage(note) {
  const n = note.refusals || 1;
  const what =
    note.kind === "login"
      ? "Instagram refused to show this to a visitor who is not logged in"
      : "Instagram asked us to slow down";
  return (
    `${what} (${note.reason}). ` +
    (n > 1 ? `This is refusal number ${n} in a row from this internet connection. ` : "") +
    `The tools will not contact Instagram again before ${clock(note.until)}. ` +
    `This is not a missing program and not something a command can fix: do not retry, do not look ` +
    `for another way in, and never delete or edit the pause note. ` +
    `The job is NOT stuck. Offer the person the ways forward from AGENTS.md ("When Instagram ` +
    `refuses"): use what is already collected, bring the videos themselves (open_folder), paste ` +
    `the words in the chat, wait until the time above, or one try from another internet connection.` +
    (getMetaToken()
      ? ``
      : ` A lasting fix to offer as well: an Instagram key from Meta, which opens the official route and ` +
        `works even during this pause. Give the person the short tutorial from AGENTS.md ("The Instagram ` +
        `key: the short tutorial"; full guide: docs/official-instagram-route.md).`)
  );
}

// Writes the pause note. Refusals in a row climb the ladder of longer pauses.
// Exported so that a refusal seen outside the tools can be written down too.
export function startPause(reason, { kind = "busy", atLeastMinutes = 0 } = {}) {
  const before = readNote();
  const inARow =
    before?.since && Date.now() - Date.parse(before.since) < FORGET_REFUSALS_AFTER_MS
      ? before.refusals || 1
      : 0;
  const refusals = inARow + 1;
  const step = PAUSE_LADDER_MINUTES[Math.min(refusals, PAUSE_LADDER_MINUTES.length) - 1];
  const minutes = Math.max(step, atLeastMinutes);
  const note = {
    until: Date.now() + minutes * 60 * 1000,
    reason,
    kind,
    refusals,
    since: new Date().toISOString(),
    lastOk: before?.lastOk || null,
    // one "I changed network" try per series of refusals (see waivePauseOnce)
    newNetworkTryUsed: inARow > 0 ? !!before?.newNetworkTryUsed : false,
  };
  writeNote(note);
  pauseWaived = false;
  return new InstagramPause(pauseMessage(note), note.until);
}

// Instagram answered a data request properly: the series of refusals is over.
function noteSuccess() {
  const before = readNote();
  if (before && !before.refusals && before.lastOk && Date.now() - Date.parse(before.lastOk) < 60000) return;
  writeNote({ until: 0, reason: "", kind: "", refusals: 0, since: null, lastOk: new Date().toISOString(), newNetworkTryUsed: false });
}

// "I am on another internet connection now." A pause protects the connection
// that was refused, so on a different connection one careful try is fair.
// Allowed once per series of refusals; if that try is refused too, the pause
// comes back longer and stays.
let pauseWaived = false;

export function waivePauseOnce() {
  const note = currentPause();
  if (!note) return { ok: true };
  if (note.newNetworkTryUsed) {
    return {
      ok: false,
      message:
        "The one try on a new internet connection was already used, and Instagram refused that too. " +
        pauseMessage(note),
    };
  }
  writeNote({ ...note, newNetworkTryUsed: true });
  pauseWaived = true;
  return { ok: true };
}

function stopIfPaused() {
  if (pauseWaived) return;
  const note = currentPause();
  if (note) throw new InstagramPause(pauseMessage(note), note.until);
}

// ---------------------------------------------------------------------------
// One door for every request to Instagram: check the pause, wait politely,
// and recognise a "slow down" answer.
// ---------------------------------------------------------------------------
let lastRequestAt = 0;

async function politeWait() {
  if (lastRequestAt > 0) {
    const gap = MIN_GAP_MS + Math.random() * Math.max(0, MAX_GAP_MS - MIN_GAP_MS);
    const remaining = lastRequestAt + gap - Date.now();
    if (remaining > 0) await sleep(remaining);
  }
  lastRequestAt = Date.now();
}

async function askInstagram(url, options = {}) {
  stopIfPaused();
  await politeWait();
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    const cause = err?.cause?.code || err?.cause?.message || err.message;
    // Not a block: this program simply has no internet road to Instagram.
    // That happens when it runs inside an app's protected space (a sandbox).
    const err2 = new Error(
      `NO INTERNET FROM HERE: this program could not reach Instagram at all (${cause}). ` +
        `Instagram did not refuse anything, so this is not a block and no pause was written. ` +
        `It usually means the tool was started as a command inside an app's protected space. ` +
        `Do not retry and do not ask the person to run commands: use the toolbox tools from your ` +
        `tool list (they run on the person's computer). If they are not in your list, tell the ` +
        `person what AGENTS.md says for "NO INTERNET FROM HERE" (the setup is done once, in a part of the app that reaches their computer).`
    );
    err2.noInternet = true;
    throw err2;
  }
  // 401 and 429 are Instagram's two ways of refusing a visitor.
  if (res.status === 401 || res.status === 429) {
    let answer = "";
    try {
      answer = await res.text();
    } catch {
      // no readable answer: the code alone is enough
    }
    const wantsLogin = /"require_login"\s*:\s*true/.test(answer);
    const retryAfter = Number(res.headers.get("retry-after"));
    throw startPause(`code ${res.status}${wantsLogin ? ", login required" : ""}`, {
      kind: wantsLogin ? "login" : "busy",
      atLeastMinutes: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter / 60) : 0,
    });
  }
  // Being sent to the login page means the same thing for a visitor.
  if (/\/accounts\/login/.test(res.url || "")) {
    throw startPause("it sent us to the login page", { kind: "login" });
  }
  return res;
}

// Reads JSON. Tries again only for hiccups (a server error), never for a block.
async function getJson(url, { referer, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await askInstagram(url, {
        headers: { ...BROWSER_HEADERS, ...(referer ? { Referer: referer } : {}) },
      });
      if (res.status >= 500) throw new Error(`Instagram answered ${res.status} ${res.statusText}`);
      if (!res.ok) {
        const err = new Error(`Instagram answered ${res.status} ${res.statusText}`);
        err.final = true;
        throw err;
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw startPause("it sent a login page instead of data", { kind: "login" });
      }
    } catch (err) {
      if (err.paused || err.final || err.noInternet) throw err;
      lastError = err;
      if (attempt < retries) await sleep(3000);
    }
  }
  throw lastError;
}

function isVideo(item) {
  return (
    item?.media_type === 2 ||
    item?.product_type === "clips" ||
    item?.product_type === "igtv"
  );
}

function toVideoRecord(item) {
  const shortcode = item.code || "";
  const timestamp = item.taken_at || 0;
  const isReel = item.product_type === "clips" || item.product_type === "igtv";
  return {
    shortcode,
    url: shortcode ? `https://www.instagram.com/${isReel ? "reel" : "p"}/${shortcode}/` : "",
    type: item.product_type || "video",
    timestamp,
    taken_at: timestamp ? new Date(timestamp * 1000).toISOString() : "",
    views: item.play_count ?? item.ig_play_count ?? item.view_count ?? null,
    likes: item.like_count ?? null,
    comments: item.comment_count ?? null,
    duration: item.video_duration ?? null,
    caption: item.caption?.text ?? "",
    thumbnail: item.image_versions2?.candidates?.[0]?.url || item.display_uri || "",
    // The address of the video file, when the list already carries it. It
    // saves one request per video later (it expires after some hours).
    video_url: item.video_versions?.[0]?.url || "",
    source: "public",
  };
}

// Opens the public profile page. The website hands every visitor two
// short-lived "visitor tickets"; we need them to ask for the list of posts.
// This single request is also our "is Instagram answering?" check.
export async function openProfilePage(account) {
  const res = await askInstagram(`https://www.instagram.com/${account}/`, {
    headers: { ...BROWSER_HEADERS, Accept: "text/html,application/xhtml+xml" },
  });
  if (res.status === 404) throw new Error(`There is no public Instagram account called @${account}.`);
  if (!res.ok) throw new Error(`Instagram answered ${res.status} ${res.statusText}`);
  const html = await res.text();
  const setCookie = res.headers.get("set-cookie") || "";
  const csrf =
    setCookie.match(/csrftoken=([^;]+)/)?.[1] ||
    html.match(/"csrf_token":"([^"]+)"/)?.[1] ||
    null;
  const lsd =
    html.match(/"LSD",\[\],\{"token":"([^"]+)"/)?.[1] ||
    html.match(/"lsd":"([^"]+)"/)?.[1] ||
    null;
  if (!csrf || !lsd) throw startPause("it did not hand out visitor tickets");
  return { csrf, lsd, html };
}

// Self-repair: look inside the website's own code for the current request id.
// (These files come from a public file server, not from Instagram's data
// service, so they do not count as visits.)
async function findCurrentPostsDocId(html) {
  const scripts = [
    ...new Set([...html.matchAll(/(https:\/\/[^"]+?\.js)"/g)].map((m) => m[1])),
  ];
  const score = (u) => (/Profile|Posts|Consumer/i.test(u) ? 1 : 0);
  scripts.sort((a, b) => score(b) - score(a));
  for (const url of scripts.slice(0, 12)) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": BROWSER_HEADERS["User-Agent"] } });
      const code = await res.text();
      if (!code.includes("ProfilePostsTabContentQuery")) continue;
      const m = code.match(
        /PolarisProfilePostsTabContentQuery_connection[\s\S]{0,4000}?"(\d{15,})"/
      );
      if (m) return m[1];
    } catch {
      // unreachable script: try the next one
    }
  }
  return null;
}

async function fetchPostsPage({ account, after, docId, tickets }) {
  const variables = {
    after: after || null,
    before: null,
    data: { count: PAGE_SIZE },
    first: PAGE_SIZE,
    last: null,
    username: account,
  };
  for (const flag of PROVIDER_FLAGS) variables[flag] = false;

  const body = new URLSearchParams();
  body.set("av", "0");
  body.set("__comet_req", "7");
  body.set("lsd", tickets.lsd || "");
  body.set("doc_id", docId);
  body.set("fb_api_caller_class", "RelayModern");
  body.set("fb_api_req_friendly_name", POSTS_FRIENDLY_NAME);
  body.set("variables", JSON.stringify(variables));
  body.set("server_timestamps", "true");

  const res = await askInstagram("https://www.instagram.com/graphql/query", {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      "x-csrftoken": tickets.csrf || "",
      "x-fb-lsd": tickets.lsd || "",
      "x-fb-friendly-name": POSTS_FRIENDLY_NAME,
      Referer: `https://www.instagram.com/${account}/`,
      Cookie: tickets.csrf ? `csrftoken=${tickets.csrf}` : "",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Instagram answered ${res.status} ${res.statusText}`);
  let json;
  try {
    json = JSON.parse(await res.text());
  } catch {
    throw startPause("it sent a page instead of data", { kind: "login" });
  }
  const page = json?.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
  if (!page) {
    const why = JSON.stringify(json?.errors || json?.error || "no posts in the answer");
    throw new Error(`Instagram did not return posts: ${why.slice(0, 120)}`);
  }
  return page;
}

// Collects the videos of a public account, page by page.
// Never throws for a partial result: it returns what it has plus the problems.
// If Instagram asks us to slow down, `paused` holds the message.
export async function fetchAccountVideos(account, { maxPages = 5, log = () => {} } = {}) {
  const videos = [];
  const seen = new Set();
  const problems = [];
  let pages = 0;
  let paused = null;
  let noInternet = false;

  try {
    const tickets = await openProfilePage(account);
    log(`Opened the public page of @${account}.`);

    let docId = DEFAULT_POSTS_DOC_ID;
    let after = null;
    let more = true;

    while (more && pages < maxPages) {
      let page;
      try {
        page = await fetchPostsPage({ account, after, docId, tickets });
      } catch (err) {
        if (err.paused || err.noInternet) throw err;
        if (pages === 0) {
          const fresh = await findCurrentPostsDocId(tickets.html);
          if (!fresh || fresh === docId) throw err;
          log(`The usual request id stopped working. Found the new one and retried.`);
          docId = fresh;
          page = await fetchPostsPage({ account, after, docId, tickets });
        } else {
          problems.push(`Stopped at page ${pages + 1}: ${err.message}`);
          break;
        }
      }
      pages++;
      noteSuccess();
      let found = 0;
      for (const edge of page.edges || []) {
        if (!isVideo(edge.node)) continue;
        const video = toVideoRecord(edge.node);
        if (video.shortcode && !seen.has(video.shortcode)) {
          seen.add(video.shortcode);
          videos.push(video);
          found++;
        }
      }
      log(`Page ${pages}: ${(page.edges || []).length} posts, ${found} of them videos.`);
      more = page.page_info?.has_next_page === true && !!page.page_info?.end_cursor;
      after = page.page_info?.end_cursor || null;
    }
    if (more && pages >= maxPages) {
      log(`Stopped after ${pages} pages on purpose (the limit). Older posts were not read.`);
    }
  } catch (err) {
    if (err.paused) paused = err.message;
    problems.push(err.message);
    if (err.noInternet) noInternet = true;
  }

  videos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return { videos, pages, problems, paused, noInternet };
}

// Finds the address of the video file for one post.
export async function resolveVideoFileUrl(shortcode) {
  const url =
    `https://www.instagram.com/graphql/query?doc_id=${encodeURIComponent(SHORTCODE_DOC_ID)}` +
    `&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`;
  const json = await getJson(url, { referer: `https://www.instagram.com/reel/${shortcode}/` });
  const media = json?.data?.xdt_shortcode_media;
  if (!media) throw new Error("Instagram did not return this post.");
  if (!media.video_url) throw new Error("This post has no video file.");
  return media.video_url;
}

// Downloads the video file itself (from Instagram's file servers).
export async function downloadFile(url, destination) {
  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        Accept: "*/*",
        Referer: "https://www.instagram.com/",
      },
    });
  } catch (err) {
    throw new Error(`Could not download the file: ${err?.cause?.code || err.message}`);
  }
  if (!res.ok) throw new Error(`Download answered ${res.status} ${res.statusText}`);
  if (!res.body) throw new Error("Download came back empty.");
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const partial = destination + ".part";
  await pipeline(Readable.fromWeb(res.body), createWriteStream(partial));
  await fs.rename(partial, destination);
}
