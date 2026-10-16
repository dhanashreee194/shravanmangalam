// The app speaks in ONE voice, chosen by the owner — never by each user. In order:
//   1. Recordings made in the Voice Studio (best — real chanting, real pronunciation).
//   2. A clone of the owner's voice (ElevenLabs instant voice cloning). ELEVENLABS_API_KEY.
//   3. An Indian devotional AI voice (Sarvam AI "Bulbul", trained on Indian speakers).
//      SARVAM_API_KEY. The owner picks the voice once in the Voice Studio.
// ffmpeg (if installed) cleans every recording: converts to M4A so iPhones can play it,
// trims silence at both ends, and evens out the volume.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { sanskritForTts } from './pronounce.js';

const run = promisify(execFile);

export const CLONE_KEY = process.env.ELEVENLABS_API_KEY || '';
const CLONE_API = (process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io').replace(/\/+$/, '');
const CLONE_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

let ffmpegAvailable = null;
export async function hasFfmpeg() {
  if (ffmpegAvailable === null) {
    ffmpegAvailable = await run('ffmpeg', ['-version']).then(() => true, () => false);
  }
  return ffmpegAvailable;
}

const PLAYS_EVERYWHERE = new Set(['.mp3', '.m4a', '.aac', '.mp4']);
// Trim leading/trailing silence (reverse trick for the end) and normalise loudness.
const CLEAN_FILTER = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.25',
  'areverse',
  'loudnorm=I=-16:TP=-1.5:LRA=11',
].join(',');

/**
 * Prepares an uploaded recording so every phone can play it.
 * clean=true (Voice Studio) also trims silence and evens the volume.
 * Returns the new filename (or the original if nothing changed / ffmpeg is missing).
 */
export async function normalizeAudio(dir, filename, { clean = false } = {}) {
  const ext = path.extname(filename).toLowerCase();
  if ((!clean && PLAYS_EVERYWHERE.has(ext)) || !(await hasFfmpeg())) return filename;
  const out = filename.replace(/\.[^.]*$/, '') + '-v.m4a';
  const args = ['-y', '-loglevel', 'error', '-i', path.join(dir, filename), '-vn'];
  if (clean) args.push('-af', CLEAN_FILTER, '-ar', '44100');
  args.push('-c:a', 'aac', '-b:a', '128k', path.join(dir, out));
  try {
    await run('ffmpeg', args);
    fs.rmSync(path.join(dir, filename), { force: true });
    return out;
  } catch (err) {
    console.warn('ffmpeg processing failed, keeping original:', err.message);
    return filename;
  }
}

async function cloneFetch(pathname, init) {
  if (!CLONE_KEY) throw new Error('ELEVENLABS_API_KEY is not set on the server');
  let res;
  try {
    res = await fetch(`${CLONE_API}${pathname}`, { ...init, headers: { 'xi-api-key': CLONE_KEY, ...(init.headers || {}) } });
  } catch (err) {
    throw new Error(`Could not reach the voice service (${err.cause?.code || err.message}). Check the internet connection.`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Voice service error ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res;
}

/** Creates the owner's cloned voice from sample recordings. Returns the voice id. */
export async function createClone(name, samplePaths) {
  const form = new FormData();
  form.append('name', name);
  form.append('description', 'Owner voice for Shravan Mangalam (cloned with the owner’s consent)');
  form.append('remove_background_noise', 'true');
  form.append('labels', JSON.stringify({ language: 'hi', use_case: 'devotional' }));
  for (const p of samplePaths) {
    form.append('files', new Blob([fs.readFileSync(p)], { type: 'audio/mp4' }), path.basename(p));
  }
  const res = await cloneFetch('/v1/voices/add', { method: 'POST', body: form });
  const { voice_id } = await res.json();
  if (!voice_id) throw new Error('Voice service did not return a voice id');
  return voice_id;
}

/**
 * Speaks text in the owner's cloned voice; returns MP3 bytes.
 * kind 'chant' = a Sanskrit line (slower, steadier, pronunciation rules applied); 'speak' = normal speech.
 */
export async function speakAsOwner(voiceId, text, kind) {
  const isChant = kind === 'chant';
  const res = await cloneFetch(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: isChant ? sanskritForTts(text) : text,
      model_id: CLONE_MODEL,
      voice_settings: {
        stability: isChant ? 0.7 : 0.5,
        similarity_boost: 0.9,
        style: 0,
        use_speaker_boost: true,
        speed: isChant ? 0.8 : 0.95,
      },
    }),
  });
  return Buffer.from(await res.arrayBuffer());
}

// ---------- Indian AI voice (Sarvam AI, bulbul:v4-flash) ----------
export const INDIAN_KEY = process.env.SARVAM_API_KEY || '';
const INDIAN_API = (process.env.SARVAM_API_URL || 'https://api.sarvam.ai').replace(/\/+$/, '');
const INDIAN_MODEL = process.env.SARVAM_MODEL || 'bulbul:v4-flash';

/** Indian voices offered in the Voice Studio. Devotional ones suit chanting; narration suits meanings. */
export const INDIAN_VOICES = {
  hi: [
    { id: 'shubh_hi_devotional', name: 'Shubh — devotional' },
    { id: 'girish_hi_devotional', name: 'Girish — devotional' },
    { id: 'ratan_hi_devotional', name: 'Ratan — devotional' },
    { id: 'nachiket_hi_devotional', name: 'Nachiket — devotional' },
    { id: 'mani_hi_devotional', name: 'Mani — devotional' },
    { id: 'ishita_hi_devotional', name: 'Ishita — devotional' },
    { id: 'roopa_hi_narration', name: 'Roopa — narration' },
    { id: 'shilpa_hi_narration', name: 'Shilpa — narration' },
  ],
  en: [
    { id: 'girish_en_devotional', name: 'Girish — devotional (Indian English)' },
    { id: 'shubh_en_narration_gentle', name: 'Shubh — gentle narration (Indian English)' },
    { id: 'simran_en_narration', name: 'Simran — narration (Indian English)' },
  ],
};
export const DEFAULT_INDIAN_VOICE = { hi: 'shubh_hi_devotional', en: 'girish_en_devotional' };

/**
 * Speaks text in the chosen Indian voice; returns MP3 bytes.
 * kind 'chant' = a Sanskrit line: pronunciation rules + breaths applied, slower and steadier.
 * lang 'hi' (also used for Sanskrit) or 'en' (Indian English meanings).
 */
export async function speakIndian(text, kind, lang, speaker) {
  if (!INDIAN_KEY) throw new Error('SARVAM_API_KEY is not set on the server');
  const isChant = kind === 'chant';
  const body = {
    text: isChant ? sanskritForTts(text) : text,
    language_code: lang === 'en' ? 'en-IN' : 'hi-IN',
    model: INDIAN_MODEL,
    speaker: speaker || DEFAULT_INDIAN_VOICE[lang === 'en' ? 'en' : 'hi'],
    pace: isChant ? 0.8 : 0.95,
    speech_sample_rate: 24000,
    output_audio_codec: 'mp3',
  };
  let res;
  try {
    res = await fetch(`${INDIAN_API}/text-to-speech`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-subscription-key': INDIAN_KEY },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Could not reach the Indian voice service (${err.cause?.code || err.message}). Check the internet connection.`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Indian voice service error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const audio = data.audios?.[0];
  if (!audio) throw new Error('Indian voice service returned no audio');
  return Buffer.from(audio, 'base64');
}
