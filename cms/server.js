// Shloka CMS: a small API + admin panel for uploading shlokas, mantras and bhajans.
// Storage is a JSON file (data/db.json) plus audio/image files in uploads/.
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CLONE_KEY,
  createClone,
  DEFAULT_INDIAN_VOICE,
  hasFfmpeg,
  INDIAN_KEY,
  INDIAN_VOICES,
  normalizeAudio,
  speakAsOwner,
  speakIndian,
} from './lib/voice.js';
import { listSlots, promptAudio, slotRef } from './lib/slots.js';
import { SAMPLE_PASSAGE } from './content/prompts.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR / UPLOAD_DIR let a host put the library on a persistent disk.
const DB_FILE = path.join(process.env.DATA_DIR || path.join(ROOT, 'data'), 'db.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
const PORT = Number(process.env.PORT || 4000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  ADMIN_PASSWORD not set — using the default "admin123". Set it before going live.');
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

export const TYPES = ['shloka', 'mantra', 'stotra', 'gita', 'bhajan', 'aarti'];
export const LEVELS = ['kids', 'easy', 'medium', 'advanced'];

// ---------- tiny JSON database ----------
function loadDb() {
  if (!fs.existsSync(DB_FILE)) return { items: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDb(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- uploads ----------
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024, files: 200 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/');
    cb(ok ? null : new Error(`Only audio or image files are allowed (got ${file.mimetype})`), ok);
  },
});

function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.rm(file, { force: true }, () => {});
}

// ---------- validation ----------
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const flags = (urls, ai) => Object.fromEntries(Object.keys(urls).filter((k) => ai?.[k] === true).map((k) => [k, true]));
const langMap = (v) => {
  const out = {};
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) if (/^[a-z]{2,3}$/.test(k) && str(val)) out[k] = str(val);
  }
  return out;
};

function normalizeItem(input, existing = {}) {
  const errors = [];
  const title = langMap(input.title);
  if (!title.en && !title.hi) errors.push('Title (English or Hindi) is required');
  const type = TYPES.includes(input.type) ? input.type : null;
  if (!type) errors.push(`Type must be one of: ${TYPES.join(', ')}`);
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const cleanLines = lines
    .map((l) => ({
      text: str(l.text),
      transliteration: str(l.transliteration),
      meaning: langMap(l.meaning),
      // Optional respelling used only by the phone/AI voice, to fix pronunciation.
      say: str(l.say) || undefined,
      audioUrl: str(l.audioUrl) || undefined,
      // true when the recording was made by the AI voice (so a human recording can replace it).
      audioAi: l.audioAi === true && str(l.audioUrl) ? true : undefined,
      // The meaning of this line spoken in the owner's voice, per language.
      meaningAudio: langMap(l.meaningAudio),
      meaningAudioAi: flags(langMap(l.meaningAudio), l.meaningAudioAi),
    }))
    .filter((l) => l.text);
  if (!cleanLines.length) errors.push('At least one line of text is required');
  if (errors.length) return { errors };

  return {
    item: {
      id: existing.id || crypto.randomUUID(),
      slug: existing.slug || str(input.slug) || undefined,
      type,
      title,
      titleAudio: langMap(input.titleAudio),
      titleAudioAi: flags(langMap(input.titleAudio), input.titleAudioAi),
      deity: str(input.deity),
      source: str(input.source),
      level: LEVELS.includes(input.level) ? input.level : 'easy',
      tags: Array.isArray(input.tags) ? input.tags.map(str).filter(Boolean) : [],
      summary: langMap(input.summary),
      whenToChant: langMap(input.whenToChant),
      lines: cleanLines,
      fullAudioUrl: str(input.fullAudioUrl) || undefined,
      meaningAudio: langMap(input.meaningAudio),
      meaningAudioAi: flags(langMap(input.meaningAudio), input.meaningAudioAi),
      imageUrl: str(input.imageUrl) || undefined,
      order: Number.isFinite(Number(input.order)) ? Number(input.order) : 100,
      published: input.published !== false,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

// Files arrive with field names: fullAudio, image, lineAudio_<index>, meaningAudio_<lang>
async function applyFiles(item, files, previous) {
  const replaced = [];
  for (const f of files || []) {
    // Browser recordings (WebM/OGG) and WAVs are converted to M4A so every phone can play them.
    const filename = f.mimetype.startsWith('audio/') ? await normalizeAudio(UPLOAD_DIR, f.filename) : f.filename;
    const url = `/uploads/${filename}`;
    if (f.fieldname === 'fullAudio') {
      replaced.push(item.fullAudioUrl);
      item.fullAudioUrl = url;
    } else if (f.fieldname === 'image') {
      replaced.push(item.imageUrl);
      item.imageUrl = url;
    } else if (f.fieldname.startsWith('lineAudio_')) {
      const i = Number(f.fieldname.slice('lineAudio_'.length));
      if (item.lines[i]) {
        replaced.push(item.lines[i].audioUrl);
        item.lines[i].audioUrl = url;
        delete item.lines[i].audioAi;
      } else removeUpload(url);
    } else if (f.fieldname.startsWith('meaningAudio_')) {
      const lang = f.fieldname.slice('meaningAudio_'.length);
      if (/^[a-z]{2,3}$/.test(lang)) {
        replaced.push(item.meaningAudio[lang]);
        item.meaningAudio[lang] = url;
        delete item.meaningAudioAi[lang];
      } else removeUpload(url);
    } else removeUpload(url);
  }
  // Delete files that were replaced or that the editor removed.
  if (previous) {
    const keep = new Set(collectUrls(item));
    for (const u of [...collectUrls(previous), ...replaced]) if (u && !keep.has(u)) removeUpload(u);
  }
}

function collectUrls(item) {
  return [
    item.fullAudioUrl,
    item.imageUrl,
    ...item.lines.flatMap((l) => [l.audioUrl, ...Object.values(l.meaningAudio || {})]),
    ...Object.values(item.meaningAudio || {}),
    ...Object.values(item.titleAudio || {}),
  ].filter(Boolean);
}

const summaryOf = (i) => ({
  id: i.id,
  type: i.type,
  source: i.source,
  title: i.title,
  deity: i.deity,
  level: i.level,
  tags: i.tags,
  imageUrl: i.imageUrl,
  lineCount: i.lines.length,
  hasAudio: Boolean(i.fullAudioUrl || i.lines.some((l) => l.audioUrl)),
  order: i.order,
  updatedAt: i.updatedAt,
});
const sortItems = (a, b) => a.order - b.order || (a.title.en || '').localeCompare(b.title.en || '');

// ---------- app ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/admin', express.static(path.join(ROOT, 'public')));
app.get('/', (_req, res) => res.redirect('/admin/'));

// Public API used by the mobile app
app.get('/api/meta', (_req, res) => res.json({ types: TYPES, levels: LEVELS }));

app.get('/api/items', (req, res) => {
  const { type, level, q } = req.query;
  let items = loadDb().items.filter((i) => i.published);
  if (type) items = items.filter((i) => i.type === type);
  if (level) items = items.filter((i) => i.level === level);
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter((i) => JSON.stringify([i.title, i.deity, i.tags]).toLowerCase().includes(needle));
  }
  res.json(items.sort(sortItems).map(summaryOf));
});

// Full content for offline caching in one request
app.get('/api/library', (_req, res) => {
  const db = loadDb();
  const items = db.items.filter((i) => i.published).sort(sortItems);
  res.json({ updatedAt: new Date().toISOString(), items, prompts: promptAudio(db) });
});

app.get('/api/items/:id', (req, res) => {
  const item = loadDb().items.find((i) => i.id === req.params.id && i.published);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Admin API (password in the x-admin-key header)
function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key') || '';
  const a = Buffer.from(key);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.status(401).json({ error: 'Wrong admin password' });
}
const admin = express.Router();
admin.use(requireAdmin);

admin.get('/login', (_req, res) => res.json({ ok: true }));
admin.get('/capabilities', async (_req, res) =>
  res.json({
    aiVoice: Boolean((CLONE_KEY && loadDb().voice?.voiceId) || INDIAN_KEY),
    cloneService: Boolean(CLONE_KEY),
    indianService: Boolean(INDIAN_KEY),
    ffmpeg: await hasFfmpeg(),
  }),
);

// ---------- Voice Studio: the whole app in the owner's voice ----------
const LANG_OK = (l) => ['hi', 'en'].includes(l);
const savedName = (ext) => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
const voiceInfo = (db) => ({
  samples: db.voice?.samples || [],
  voiceId: db.voice?.voiceId || null,
  clonedAt: db.voice?.clonedAt || null,
  cloneService: Boolean(CLONE_KEY),
  // Indian AI voice (Sarvam): the owner's one choice for the whole app.
  indianService: Boolean(INDIAN_KEY),
  indianVoices: INDIAN_VOICES,
  indianVoice: { ...DEFAULT_INDIAN_VOICE, ...(db.voice?.indian || {}) },
});
const indianVoiceOf = (db, lang) => ({ ...DEFAULT_INDIAN_VOICE, ...(db.voice?.indian || {}) })[lang === 'en' ? 'en' : 'hi'];
const isIndianVoice = (lang, id) => (INDIAN_VOICES[lang] || []).some((v) => v.id === id);

// Save the owner's choice of Indian voice (one for Hindi/Sanskrit, one for English).
admin.post('/voice/indian', (req, res) => {
  const db = loadDb();
  db.voice ||= {};
  const next = { ...DEFAULT_INDIAN_VOICE, ...(db.voice.indian || {}) };
  for (const lang of ['hi', 'en']) {
    const id = req.body?.[lang];
    if (id === undefined) continue;
    if (!isIndianVoice(lang, id)) return res.status(400).json({ error: `Unknown ${lang} voice: ${id}` });
    next[lang] = id;
  }
  db.voice.indian = next;
  saveDb(db);
  res.json(voiceInfo(db));
});

// Hear a voice before choosing it: returns MP3.
const PREVIEW = {
  hi: { text: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ । निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥', kind: 'chant' },
  en: { text: 'O Lord with the curved trunk, shining like a crore suns, please remove all obstacles from my work, always.', kind: 'speak' },
};
admin.post('/voice/preview', async (req, res) => {
  const lang = LANG_OK(req.body?.lang) ? req.body.lang : 'hi';
  const speaker = req.body?.speaker;
  if (!isIndianVoice(lang, speaker)) return res.status(400).json({ error: 'Unknown voice' });
  const audio = await speakIndian(PREVIEW[lang].text, PREVIEW[lang].kind, lang, speaker);
  res.set('content-type', 'audio/mpeg').send(audio);
});

admin.get('/studio', (req, res) => {
  const lang = LANG_OK(req.query.lang) ? req.query.lang : 'hi';
  const db = loadDb();
  res.json({ lang, slots: listSlots(db, lang, sortItems), voice: voiceInfo(db), samplePassage: SAMPLE_PASSAGE });
});

// Save one recording into a slot (replaces whatever was there, human or clone).
admin.post('/studio/record', upload.single('audio'), async (req, res) => {
  const file = req.file;
  const db = loadDb();
  const ref = slotRef(db, req.body?.key);
  if (!ref || !file) {
    if (file) removeUpload(`/uploads/${file.filename}`);
    return res.status(400).json({ error: ref ? 'No recording received' : 'Unknown slot' });
  }
  const name = await normalizeAudio(UPLOAD_DIR, file.filename, { clean: true });
  const old = ref.get().url;
  ref.set(`/uploads/${name}`, false);
  if (ref.item) ref.item.updatedAt = new Date().toISOString();
  saveDb(db);
  if (old) removeUpload(old);
  res.json({ key: req.body.key, ...ref.get() });
});

admin.delete('/studio/record', (req, res) => {
  const db = loadDb();
  const ref = slotRef(db, req.query.key);
  if (!ref) return res.status(400).json({ error: 'Unknown slot' });
  const old = ref.get().url;
  ref.set(null);
  saveDb(db);
  if (old) removeUpload(old);
  res.json({ key: req.query.key, ...ref.get() });
});

// Voice samples for the clone (1–2 minutes of the owner reading the sample passage).
admin.post('/voice/sample', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No recording received' });
  const name = await normalizeAudio(UPLOAD_DIR, req.file.filename, { clean: true });
  const db = loadDb();
  db.voice ||= {};
  db.voice.samples = [...(db.voice.samples || []), `/uploads/${name}`];
  saveDb(db);
  res.json(voiceInfo(db));
});

admin.delete('/voice/sample', (req, res) => {
  const db = loadDb();
  const url = String(req.query.url || '');
  db.voice ||= {};
  db.voice.samples = (db.voice.samples || []).filter((u) => u !== url);
  saveDb(db);
  removeUpload(url);
  res.json(voiceInfo(db));
});

admin.post('/voice/clone', async (_req, res) => {
  const db = loadDb();
  const samples = db.voice?.samples || [];
  if (!samples.length) return res.status(400).json({ error: 'Record a voice sample first' });
  const voiceId = await createClone('Shravan Mangalam — owner', samples.map((u) => path.join(UPLOAD_DIR, path.basename(u))));
  db.voice.voiceId = voiceId;
  db.voice.clonedAt = new Date().toISOString();
  saveDb(db);
  res.json(voiceInfo(db));
});

/**
 * Fills the next few empty slots with an AI voice — the owner's clone ({ engine: 'clone' })
 * or the chosen Indian voice ({ engine: 'indian' }). The studio calls this repeatedly (small
 * batches keep each request short) until nothing is left. Recordings the owner made are never
 * touched; { redo: true } also refreshes earlier AI audio.
 */
admin.post('/voice/fill', async (req, res) => {
  const lang = LANG_OK(req.body?.lang) ? req.body.lang : 'hi';
  const max = Math.min(Math.max(Number(req.body?.max) || 6, 1), 20);
  const redo = req.body?.redo === true;
  const db = loadDb();
  const voiceId = db.voice?.voiceId;
  const cloneReady = Boolean(CLONE_KEY && voiceId);
  const engine = req.body?.engine || (cloneReady ? 'clone' : 'indian');
  if (engine === 'clone' && !cloneReady) return res.status(400).json({ error: 'Your voice clone is not set up yet' });
  if (engine === 'indian' && !INDIAN_KEY) return res.status(400).json({ error: 'The Indian voice is not set up yet (SARVAM_API_KEY)' });
  const speak = (slot) => {
    const text = slot.mode === 'chant' ? slot.say || slot.text : slot.text;
    if (engine === 'clone') return speakAsOwner(voiceId, text, slot.mode);
    // Sanskrit lines always use the Hindi/Sanskrit voice; meanings and messages use the list's language.
    const voiceLang = slot.mode === 'chant' ? 'hi' : lang;
    return speakIndian(text, slot.mode, voiceLang, indianVoiceOf(db, voiceLang));
  };
  const todo = listSlots(db, lang, sortItems).filter((s) => !s.url || (redo && s.ai));
  let made = 0;
  try {
    for (const slot of todo.slice(0, max)) {
      const audio = await speak(slot);
      const name = savedName('mp3');
      fs.writeFileSync(path.join(UPLOAD_DIR, name), audio);
      const ref = slotRef(db, slot.key);
      const old = ref.get().url;
      ref.set(`/uploads/${name}`, true);
      if (old) removeUpload(old);
      made++;
    }
  } finally {
    saveDb(db); // keep what was made even if the voice service fails halfway
  }
  res.json({ made, remaining: todo.length - made });
});

admin.get('/items', (_req, res) => res.json(loadDb().items.sort(sortItems)));
admin.get('/items/:id', (req, res) => {
  const item = loadDb().items.find((i) => i.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});

function parseBody(req) {
  if (req.body?.data) return JSON.parse(req.body.data);
  return req.body || {};
}

admin.post('/items', upload.any(), async (req, res) => {
  let input;
  try {
    input = parseBody(req);
  } catch {
    (req.files || []).forEach((f) => removeUpload(`/uploads/${f.filename}`));
    return res.status(400).json({ error: 'Invalid JSON in "data"' });
  }
  const { item, errors } = normalizeItem(input);
  if (errors) {
    (req.files || []).forEach((f) => removeUpload(`/uploads/${f.filename}`));
    return res.status(400).json({ error: errors.join('. ') });
  }
  await applyFiles(item, req.files);
  const db = loadDb();
  db.items.push(item);
  saveDb(db);
  res.status(201).json(item);
});

admin.put('/items/:id', upload.any(), async (req, res) => {
  const db = loadDb();
  const idx = db.items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    (req.files || []).forEach((f) => removeUpload(`/uploads/${f.filename}`));
    return res.status(404).json({ error: 'Not found' });
  }
  let input;
  try {
    input = parseBody(req);
  } catch {
    (req.files || []).forEach((f) => removeUpload(`/uploads/${f.filename}`));
    return res.status(400).json({ error: 'Invalid JSON in "data"' });
  }
  const previous = db.items[idx];
  const { item, errors } = normalizeItem(input, previous);
  if (errors) {
    (req.files || []).forEach((f) => removeUpload(`/uploads/${f.filename}`));
    return res.status(400).json({ error: errors.join('. ') });
  }
  await applyFiles(item, req.files, previous);
  db.items[idx] = item;
  saveDb(db);
  res.json(item);
});

admin.delete('/items/:id', (req, res) => {
  const db = loadDb();
  const item = db.items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  db.items = db.items.filter((i) => i.id !== item.id);
  saveDb(db);
  collectUrls(item).forEach(removeUpload);
  res.json({ ok: true });
});

app.use('/api/admin', admin);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err instanceof multer.MulterError ? 400 : 500).json({ error: err.message || 'Server error' });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shloka CMS running:  admin → http://localhost:${PORT}/admin/   api → http://localhost:${PORT}/api/items`);
  });
}

export default app;
