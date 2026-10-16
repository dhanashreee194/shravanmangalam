// A "slot" is one thing the app can say in the owner's voice. Every slot has a stable key:
//   prompt:<key>:<lang>              app messages (welcome, help, "your turn", collection names…)
//   item:<id>:title:<lang>           the name of a shloka
//   item:<id>:line:<i>               a chanted line (Sanskrit — same for every language)
//   item:<id>:meaning:<i>:<lang>     the meaning of a line
//   item:<id>:summary:<lang>         "what does it mean?" — the overall explanation
// The Voice Studio lists slots in learning order; recordings and the voice clone fill them.
import { PROMPTS } from '../content/prompts.js';

const parse = (key) => {
  const p = String(key).split(':');
  if (p[0] === 'prompt' && p.length === 3) return { kind: 'prompt', name: p[1], lang: p[2] };
  if (p[0] === 'item' && p[2] === 'title' && p.length === 4) return { kind: 'title', id: p[1], lang: p[3] };
  if (p[0] === 'item' && p[2] === 'line' && p.length === 4) return { kind: 'line', id: p[1], i: Number(p[3]) };
  if (p[0] === 'item' && p[2] === 'meaning' && p.length === 5) return { kind: 'meaning', id: p[1], i: Number(p[3]), lang: p[4] };
  if (p[0] === 'item' && p[2] === 'summary' && p.length === 4) return { kind: 'summary', id: p[1], lang: p[3] };
  return null;
};

/** Returns { get(): {url, ai}, set(url, ai) } for a slot key, or null if the key is unknown. */
export function slotRef(db, key) {
  const k = parse(key);
  if (!k || (k.lang && !/^[a-z]{2,3}$/.test(k.lang))) return null;
  if (k.kind === 'prompt') {
    if (!PROMPTS.some((p) => p.key === k.name)) return null;
    db.prompts ||= {};
    return box((db.prompts[k.name] ||= {}), k.lang);
  }
  const item = db.items.find((i) => i.id === k.id);
  if (!item) return null;
  if (k.kind === 'title') return pair(item, 'titleAudio', 'titleAudioAi', k.lang);
  if (k.kind === 'summary') return pair(item, 'meaningAudio', 'meaningAudioAi', k.lang);
  const line = item.lines[k.i];
  if (!line) return null;
  if (k.kind === 'meaning') return pair(line, 'meaningAudio', 'meaningAudioAi', k.lang);
  return {
    item,
    get: () => ({ url: line.audioUrl, ai: Boolean(line.audioAi) }),
    set: (url, ai) => {
      line.audioUrl = url || undefined;
      line.audioAi = url && ai ? true : undefined;
    },
  };

  function pair(obj, urlField, aiField, lang) {
    return {
      item,
      get: () => ({ url: obj[urlField]?.[lang], ai: Boolean(obj[aiField]?.[lang]) }),
      set: (url, ai) => {
        obj[urlField] ||= {};
        obj[aiField] ||= {};
        if (url) obj[urlField][lang] = url;
        else delete obj[urlField][lang];
        if (url && ai) obj[aiField][lang] = true;
        else delete obj[aiField][lang];
      },
    };
  }
}

function box(entry, lang) {
  return {
    get: () => ({ url: entry[lang], ai: Boolean(entry[`${lang}Ai`]) }),
    set: (url, ai) => {
      if (url) entry[lang] = url;
      else delete entry[lang];
      if (url && ai) entry[`${lang}Ai`] = true;
      else delete entry[`${lang}Ai`];
    },
  };
}

const LINE_WORD = { hi: 'पंक्ति', en: 'Line' };

/** Every slot for one language, in the order a person would naturally record them. */
export function listSlots(db, lang, sortItems) {
  const slots = [];
  const add = (key, group, label, text, mode, extra = {}) => {
    const ref = slotRef(db, key);
    if (!ref || !text) return;
    slots.push({ key, group, label, text, mode, ...ref.get(), ...extra });
  };
  for (const p of PROMPTS) add(`prompt:${p.key}:${lang}`, lang === 'hi' ? 'ऐप के संदेश' : 'App messages', p.label, p[lang], 'speak');
  for (const item of [...db.items].filter((i) => i.published).sort(sortItems)) {
    const group = item.title[lang] || item.title.en || item.title.hi;
    add(`item:${item.id}:title:${lang}`, group, lang === 'hi' ? 'नाम' : 'Title', item.title[lang], 'speak');
    item.lines.forEach((l, i) => {
      add(`item:${item.id}:line:${i}`, group, `${LINE_WORD[lang] || 'Line'} ${i + 1} — ${lang === 'hi' ? 'जप' : 'chant'}`, l.text, 'chant', {
        transliteration: l.transliteration,
        say: l.say,
      });
      add(`item:${item.id}:meaning:${i}:${lang}`, group, `${LINE_WORD[lang] || 'Line'} ${i + 1} — ${lang === 'hi' ? 'अर्थ' : 'meaning'}`, l.meaning?.[lang], 'speak');
    });
    const about = [item.summary?.[lang], item.whenToChant?.[lang]].filter(Boolean).join(' ');
    add(`item:${item.id}:summary:${lang}`, group, lang === 'hi' ? 'इसका अर्थ (सारांश)' : 'What it means (summary)', about, 'speak');
  }
  return slots;
}

/** Prompt recordings for the app: { key: { hi: url, en: url } } */
export function promptAudio(db) {
  const out = {};
  for (const [key, entry] of Object.entries(db.prompts || {})) {
    out[key] = Object.fromEntries(Object.entries(entry).filter(([k, v]) => /^[a-z]{2,3}$/.test(k) && v));
  }
  return out;
}
