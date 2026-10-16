// Seeds the CMS with starter shlokas, mantras and bhajans (text + meaning, no audio).
// Usage: npm run seed            (adds any starter items that aren't in the library yet — never overwrites your edits)
//        npm run seed -- --force  (replace the whole library with the starter content)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(process.env.DATA_DIR || path.join(ROOT, 'data'), 'db.json');

import starter from './content/starter.js';
import krishna from './content/krishna.js';

const items = [...starter, ...krishna];

const force = process.argv.includes('--force');
const existing = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : { items: [] };
const now = new Date().toISOString();
const toItem = (i) => ({
  id: crypto.randomUUID(),
  source: '',
  imageUrl: undefined,
  fullAudioUrl: undefined,
  meaningAudio: {},
  published: true,
  createdAt: now,
  updatedAt: now,
  ...i,
});

let db;
if (force) {
  db = { items: items.map(toItem) };
} else {
  // Match by slug, or by English title for items seeded before slugs existed.
  const have = new Set(existing.items.flatMap((i) => [i.slug, i.title?.en].filter(Boolean)));
  const missing = items.filter((i) => !have.has(i.slug) && !have.has(i.title.en));
  db = { items: [...existing.items, ...missing.map(toItem)] };
  console.log(`Adding ${missing.length} new item(s): ${missing.map((i) => i.title.en).join(', ') || 'none'}`);
}
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
console.log(`Library now has ${db.items.length} items (${path.relative(process.cwd(), DB_FILE)})`);
