// Uploads the given files to a Dropbox folder and keeps only the newest KEEP files per kind (kind = name before the date).
// Usage: node scripts/dropbox-upload.mjs file1 file2 ...
// Env: DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN, optional DROPBOX_FOLDER (default "/App backups/10bonds"), KEEP (default 14).
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const { DROPBOX_APP_KEY: key, DROPBOX_APP_SECRET: secret, DROPBOX_REFRESH_TOKEN: refresh } = process.env;
if (!key || !secret || !refresh) {
  console.error("Missing DROPBOX_APP_KEY / DROPBOX_APP_SECRET / DROPBOX_REFRESH_TOKEN.");
  process.exit(2);
}
const folder = process.env.DROPBOX_FOLDER || "/App backups/10bonds";
const keep = Number(process.env.KEEP || 14);

const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: key, client_secret: secret }),
});
if (!tokenRes.ok) throw new Error(`Dropbox sign-in failed (${tokenRes.status})`);
const token = (await tokenRes.json()).access_token;
const api = (path, body) =>
  fetch(`https://api.dropboxapi.com/2/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

for (const file of process.argv.slice(2)) {
  const name = basename(file);
  const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "dropbox-api-arg": JSON.stringify({ path: `${folder}/${name}`, mode: "overwrite", mute: true }),
      "content-type": "application/octet-stream",
    },
    body: readFileSync(file),
  });
  if (!res.ok) throw new Error(`Upload of ${name} failed (${res.status}): ${await res.text()}`);
  console.log(`uploaded ${name}`);
}

const list = await (await api("files/list_folder", { path: folder })).json();
const groups = new Map();
for (const e of list.entries || []) {
  if (e[".tag"] !== "file") continue;
  const kind = e.name.replace(/-\d{8}(-\d{4}Z)?\./, ".");
  groups.set(kind, [...(groups.get(kind) || []), e]);
}
for (const [kind, files] of groups) {
  files.sort((a, b) => b.name.localeCompare(a.name));
  for (const old of files.slice(keep)) {
    await api("files/delete_v2", { path: old.path_lower });
    console.log(`removed old ${old.name} (${kind})`);
  }
}
