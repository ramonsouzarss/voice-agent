// THE OFFICIAL ROUTE (optional): Instagram's own door for programs.
//
// Meta, the company behind Instagram, lets a professional Instagram account
// look up the public videos of OTHER professional accounts, with their likes,
// views and (often) the video file. It is called "Business Discovery".
//
// Why bother, when the public website works without any key?
//   - The website sometimes refuses visitors who are not logged in.
//   - This door does not refuse like that: it has fair, written limits.
//
// What it needs: a key from Meta ("access token") on the line
// META_ACCESS_TOKEN= of the key file. No key, no official route: the tools
// then use the public website, exactly as before.
//
// What it cannot do:
//   - Read accounts that are not professional (Business or Creator) accounts.
//   - Give the video file when the video uses licensed music, or when its
//     owner turned downloads off. The list and the numbers still come.
import fs from "node:fs";
import path from "node:path";
import { getMetaToken } from "./settings.js";
import { WORKSPACE } from "./workspace.js";

// The address of Meta's door. (Changed only by the tests.)
const GRAPH = (process.env.META_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
// Leave empty to use the version Meta picks for the app. Example: v23.0
const VERSION = (process.env.META_GRAPH_VERSION || "").trim();
const PAGE_SIZE = 50;

const MEDIA_FIELDS =
  "id,caption,comments_count,like_count,view_count,media_type,media_product_type,media_url,permalink,timestamp";

export function metaConfigured() {
  return !!getMetaToken();
}

export class MetaProblem extends Error {
  constructor(message, kind) {
    super(message);
    this.name = "MetaProblem";
    this.kind = kind; // "key" | "account" | "wait" | "network" | "other"
  }
}

// One request to Meta. The key travels in the address, as Meta asks, so the
// address itself is never shown in any message.
async function askMeta(pathAndQuery) {
  const join = pathAndQuery.includes("?") ? "&" : "?";
  const url = `${GRAPH}${VERSION ? "/" + VERSION : ""}/${pathAndQuery}${join}access_token=${encodeURIComponent(getMetaToken())}`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch (err) {
    throw new MetaProblem(
      `Could not reach Meta from here (${err?.cause?.code || err.name}).`,
      "network"
    );
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    // not JSON: handled below
  }
  if (res.ok && json && !json.error) return json;

  const e = json?.error || {};
  const said = String(e.error_user_msg || e.message || `code ${res.status}`).slice(0, 200);
  // "This account cannot be read" comes first: it is about the account that
  // was asked for, not about the key.
  if (e.error_subcode === 2207013 || /cannot be found|Invalid user id|business account/i.test(said)) {
    throw new MetaProblem(said, "account");
  }
  if (e.code === 190 || /access token|session has expired/i.test(said)) {
    throw new MetaProblem(
      `Meta did not accept the key (${said}). Meta keys stop working after about two months. ` +
        `Ask the person to make a new one and put it on the line META_ACCESS_TOKEN= of their key file ` +
        `(docs/official-instagram-route.md has the steps). You never read or write that key.`,
      "key"
    );
  }
  if ([4, 17, 32, 613, 80002].includes(e.code)) {
    throw new MetaProblem(`Meta asks to wait before asking again (${said}). Try again in an hour.`, "wait");
  }
  if ([10, 200, 803].includes(e.code) || /permission/i.test(said)) {
    throw new MetaProblem(
      `The Meta key does not have the needed permissions (${said}). ` +
        `It needs: instagram_basic, instagram_manage_insights, pages_read_engagement, pages_show_list ` +
        `(docs/official-instagram-route.md).`,
      "key"
    );
  }
  throw new MetaProblem(`Meta answered with a problem: ${said}`, "other");
}

// Which Instagram account does the key belong to? Asked once, then remembered
// in the workspace (it is not a secret, only a number and a name).
const MEMO = path.join(WORKSPACE, "meta-account.json");

export async function metaAccount({ fresh = false } = {}) {
  if (process.env.META_IG_USER_ID) return { id: process.env.META_IG_USER_ID.trim(), username: "" };
  if (!fresh) {
    try {
      const memo = JSON.parse(fs.readFileSync(MEMO, "utf8"));
      if (memo.id) return memo;
    } catch {
      // nothing remembered yet
    }
  }
  const pages = await askMeta("me/accounts?fields=name,instagram_business_account{id,username}&limit=100");
  const page = (pages.data || []).find((p) => p.instagram_business_account?.id);
  if (!page) {
    throw new MetaProblem(
      "The Meta key works, but it is not linked to a professional Instagram account. " +
        "The person's Instagram account must be a Business or Creator account connected to a Facebook Page " +
        "(docs/official-instagram-route.md).",
      "key"
    );
  }
  const account = {
    id: page.instagram_business_account.id,
    username: page.instagram_business_account.username || "",
    page: page.name || "",
  };
  try {
    fs.mkdirSync(WORKSPACE, { recursive: true });
    fs.writeFileSync(MEMO, JSON.stringify(account, null, 2), "utf8");
  } catch {
    // not being able to remember is fine
  }
  return account;
}

function toVideoRecord(item) {
  const link = item.permalink || "";
  const shortcode = link.match(/\/(?:reels?|p|tv)\/([^/?#]+)/)?.[1] || item.id || "";
  const timestamp = item.timestamp ? Math.floor(Date.parse(item.timestamp) / 1000) : 0;
  return {
    shortcode,
    url: link,
    type: item.media_product_type === "REELS" ? "clips" : String(item.media_product_type || "video").toLowerCase(),
    timestamp,
    taken_at: timestamp ? new Date(timestamp * 1000).toISOString() : "",
    views: item.view_count ?? null,
    likes: item.like_count ?? null,
    comments: item.comments_count ?? null,
    duration: null,
    caption: item.caption ?? "",
    thumbnail: "",
    video_url: item.media_url || "",
    source: "meta",
  };
}

// Collects the videos of a professional account through the official route.
// Returns the same shape as the public route, so the tools do not care which
// road the list came by.
export async function fetchAccountVideosMeta(account, { maxPosts = 60, log = () => {} } = {}) {
  const me = await metaAccount();
  const videos = [];
  const problems = [];
  let posts = 0;
  let after = null;
  let pages = 0;

  while (posts < maxPosts) {
    const want = Math.min(PAGE_SIZE, maxPosts - posts);
    const media = `media${after ? `.after(${after})` : ""}.limit(${want}){${MEDIA_FIELDS}}`;
    const fields = `business_discovery.username(${account}){username,media_count,${media}}`;
    let answer;
    try {
      answer = await askMeta(`${me.id}?fields=${encodeURIComponent(fields)}`);
    } catch (err) {
      if (pages === 0) throw err;
      problems.push(`Stopped at page ${pages + 1}: ${err.message}`);
      break;
    }
    pages++;
    const page = answer?.business_discovery?.media;
    const items = page?.data || [];
    let found = 0;
    for (const item of items) {
      if (item.media_type !== "VIDEO") continue;
      videos.push(toVideoRecord(item));
      found++;
    }
    posts += items.length;
    log(`Official route, page ${pages}: ${items.length} posts, ${found} of them videos.`);
    after = page?.paging?.cursors?.after || null;
    if (!after || items.length === 0) break;
  }

  videos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const withoutFile = videos.filter((v) => !v.video_url).length;
  return { videos, pages, problems, withoutFile };
}

// For check_setup: does the key work, and for which Instagram account?
export async function checkMeta() {
  const me = await metaAccount({ fresh: true });
  return me.username ? `@${me.username}` : `account number ${me.id}`;
}
