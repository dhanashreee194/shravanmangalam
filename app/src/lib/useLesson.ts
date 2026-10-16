import { useEffect, useRef, useState } from 'react';
import { Cancelled, Chanter } from './chanter';
import { TTS_LANG } from './i18n';
import { AudioRef, useLibrary } from './library';
import { sanskritForTts } from './pronounce';
import { useProgress } from './progress';
import { PROMPT_TEXT, PromptKey } from './prompts';
import { useSettings } from './settings';
import { Item, pick } from './types';
import { useVoice } from './voices';

export type Phase = 'idle' | 'listen' | 'yourTurn' | 'together' | 'meaning' | 'done';

const AUDIO_RATE = { slow: 0.75, normal: 1 };
// Slower and a touch lower than default: calmer, closer to how a person chants.
const CHANT_TTS = { slow: { rate: 0.5, pitch: 0.95 }, normal: { rate: 0.72, pitch: 0.95 } };
const MEANING_TTS = { rate: 0.88, pitch: 1 };

/**
 * The guru–shishya lesson for one item: play a line, leave a gap to repeat it, then
 * chant everything together. Shared by the normal Learn screen and Listen mode.
 * Everything is spoken in the owner's voice (their recordings, or their voice clone); the
 * phone's most natural voice is only a fallback for parts not recorded yet.
 */
export function useLesson(item: Item | undefined, chanter: Chanter) {
  const { lang, speed, repeatCount, chime } = useSettings();
  const { audio, promptUrl, markLearned } = useLibrary();
  const { practiced } = useProgress();
  const hiVoice = useVoice('hi');
  const meaningVoice = useVoice(lang);

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);

  // Keep the latest speed in a ref so a running lesson picks up changes immediately.
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const lines = item?.lines ?? [];
  const busy = phase !== 'idle' && phase !== 'done';

  /** Plays a recording; false if it can't be reached (so the caller can fall back). */
  async function tryPlay(url: AudioRef, rate: number, token: number): Promise<boolean> {
    try {
      await chanter.playUrl(url, rate, token);
      return true;
    } catch (e) {
      if (e instanceof Cancelled) throw e;
      return false;
    }
  }

  async function chantLine(i: number, token: number) {
    const l = lines[i];
    const url = audio(l.audioUrl);
    if (url) {
      try {
        return await chanter.playUrl(url, AUDIO_RATE[speedRef.current], token);
      } catch (e) {
        if (e instanceof Cancelled) throw e; // recording unreachable → phone voice below
      }
    }
    const tts = CHANT_TTS[speedRef.current];
    return chanter.speak(l.say || sanskritForTts(l.text), { language: TTS_LANG.sa, voice: hiVoice, ...tts }, token);
  }

  async function chantAll(token: number) {
    const full = audio(item?.fullAudioUrl);
    if (full && (await tryPlay(full, AUDIO_RATE[speedRef.current], token))) return;
    for (let i = 0; i < lines.length; i++) {
      setIdx(i);
      await chantLine(i, token);
      await chanter.wait(0.4, token);
    }
  }

  const speakMeaning = (text: string, token: number) =>
    chanter.speak(text, { language: TTS_LANG[lang], voice: meaningVoice, ...MEANING_TTS }, token);

  /** A piece of speech: the owner's recording if there is one, otherwise the text for the phone voice. */
  type Part = { url?: AudioRef; text: string };
  async function speakParts(parts: Part[], token: number) {
    for (const part of parts) {
      const url = typeof part.url === 'number' ? part.url : audio(part.url);
      if (url) {
        try {
          await chanter.playUrl(url, 1, token);
          continue;
        } catch (e) {
          if (e instanceof Cancelled) throw e; // recording unreachable → phone voice below
        }
      }
      if (part.text) await speakMeaning(part.text, token);
    }
  }
  const prompt = (key: PromptKey): Part => ({ url: promptUrl(key, lang), text: PROMPT_TEXT[key][lang] });
  const recorded = (key: PromptKey) => promptUrl(key, lang);

  /** Runs one lesson step; stop() (or leaving the screen) cancels it cleanly. */
  async function run(fn: (token: number) => Promise<void>) {
    const token = chanter.begin();
    try {
      await fn(token);
    } catch (e) {
      if (!(e instanceof Cancelled)) console.warn(e);
      return;
    }
    setRound(0);
    setPhase((p) => (p === 'done' ? p : 'idle'));
  }

  const stop = () => {
    chanter.stop();
    setPhase('idle');
    setRound(0);
  };

  const go = (i: number) => {
    stop();
    // Clamp to a valid line (and never below 0, even before the item's lines have loaded).
    const next = Math.max(0, Math.min(lines.length - 1, i));
    setIdx(next);
    return next;
  };

  const playLine = (i = idx) =>
    run(async (token) => {
      setIdx(i);
      setPhase('listen');
      await chantLine(i, token);
    });

  const playAll = () =>
    run(async (token) => {
      setPhase('together');
      await chantAll(token);
    });

  const repeatAfterMe = (from = idx) =>
    run(async (token) => {
      for (let i = from; i < lines.length; i++) {
        setIdx(i);
        for (let r = 1; r <= repeatCount; r++) {
          setRound(r);
          setPhase('listen');
          const seconds = await chantLine(i, token);
          setPhase('yourTurn');
          // "अब आप" in the owner's voice if recorded, otherwise the soft temple bell.
          const turn = recorded('yourTurn');
          const saidTurn = turn ? await tryPlay(turn, 1, token) : false;
          if (!saidTurn && chime) chanter.cue('turn');
          await chanter.wait(Math.max(2.5, seconds * 1.3 + 1) + (!saidTurn && chime ? 0.6 : 0), token);
        }
      }
      setRound(0);
      setPhase('together');
      const together = recorded('allTogether');
      if (together) await tryPlay(together, 1, token);
      await chanter.wait(0.6, token);
      await chantAll(token);
      if (item) markLearned(item.id);
      practiced();
      setPhase('done');
      if (chime) chanter.cue('done');
      const praise = recorded('wellDone');
      if (praise) {
        await chanter.wait(1.2, token);
        await tryPlay(praise, 1, token);
      }
    });

  const hearLineMeaning = (i = idx) =>
    run(async (token) => {
      setPhase('meaning');
      await speakParts([{ url: lines[i]?.meaningAudio?.[lang], text: pick(lines[i]?.meaning, lang) }], token);
    });

  const hearSummary = () =>
    run(async (token) => {
      if (!item) return;
      setPhase('meaning');
      const url = audio(item.meaningAudio?.[lang]);
      if (url && (await tryPlay(url, 1, token))) return;
      // No summary recording yet: build it from the owner's other recordings where possible.
      await speakParts(
        [
          { url: item.titleAudio?.[lang], text: pick(item.title, lang) },
          { text: pick(item.summary, lang) },
          ...lines.map((l) => ({ url: l.meaningAudio?.[lang], text: pick(l.meaning, lang) })),
        ],
        token,
      );
    });

  /** Speak a sequence of parts (Listen mode announcements) in the owner's voice where recorded. */
  const announce = (parts: Part[]) =>
    run(async (token) => {
      await speakParts(parts, token);
    });

  return { idx, phase, round, busy, lines, go, stop, playLine, playAll, repeatAfterMe, hearLineMeaning, hearSummary, announce, prompt, reset: () => setIdx(0) };
}
