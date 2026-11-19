// Reading and writing the video list (a CSV file = a simple table you can open
// in Excel).
import { promises as fs } from "node:fs";
import path from "node:path";

export const COLUMNS = [
  "shortcode",
  "url",
  "type",
  "taken_at",
  "timestamp",
  "views",
  "likes",
  "comments",
  "duration",
  "caption",
  "thumbnail",
  "video_url",
  "source",
];

function escapeField(value) {
  if (value === null || value === undefined) return "";
  let s = String(value).replace(/\r\n|\r|\n/g, " ");
  if (/[",]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(videos) {
  const lines = [COLUMNS.join(",")];
  for (const v of videos) lines.push(COLUMNS.map((c) => escapeField(v[c])).join(","));
  return lines.join("\n") + "\n";
}

// Splits CSV text into rows and fields, respecting "quoted, fields".
export function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  const endRow = () => {
    row.push(field);
    field = "";
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) endRow();
  return rows;
}

export async function readVideoList(csvPath) {
  let text;
  try {
    text = await fs.readFile(csvPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((row) => {
    const record = {};
    header.forEach((col, i) => (record[col] = row[i] ?? ""));
    record.timestamp = record.timestamp ? Number(record.timestamp) : 0;
    return record;
  });
}

// New videos are added, known videos get fresh numbers, newest first.
export function mergeVideoLists(existing, fresh) {
  const byCode = new Map();
  for (const v of existing) if (v.shortcode) byCode.set(v.shortcode, v);
  let added = 0;
  let updated = 0;
  for (const v of fresh) {
    if (!v.shortcode) continue;
    if (byCode.has(v.shortcode)) updated++;
    else added++;
    byCode.set(v.shortcode, { ...byCode.get(v.shortcode), ...v });
  }
  const merged = [...byCode.values()].sort(
    (a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)
  );
  return { merged, added, updated };
}

export async function writeVideoList(csvPath, videos) {
  await fs.mkdir(path.dirname(csvPath), { recursive: true });
  await fs.writeFile(csvPath, toCsv(videos), "utf8");
}

// The two ways to rank videos. "likes" is the default everywhere.
export const RANKINGS = ["likes", "views"];

export function cleanRanking(by) {
  const value = String(by || "likes").trim().toLowerCase();
  if (!RANKINGS.includes(value)) {
    throw new Error(`Videos can be ranked by "likes" or by "views", not by "${by}".`);
  }
  return value;
}

// Most liked (or most viewed) first.
export function sortBy(videos, by = "likes") {
  const key = cleanRanking(by);
  return [...videos].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
}

export function sortByLikes(videos) {
  return sortBy(videos, "likes");
}
