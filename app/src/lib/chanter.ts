import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

export class Cancelled extends Error {}

export interface SpeakOptions {
  language: string;
  rate: number;
  pitch?: number;
  /** Voice identifier from expo-speech; undefined = the system default for the language. */
  voice?: string;
}

const CUES = {
  turn: require('../../assets/sounds/turn.wav'),
  done: require('../../assets/sounds/done.wav'),
  tick: require('../../assets/sounds/tick.wav'),
};
export type Cue = keyof typeof CUES;

/**
 * Plays one thing at a time — a recorded clip or the phone's voice — and lets a
 * whole sequence (e.g. "repeat after me") be cancelled with a single stop().
 * Every play resolves with how long it took, so we can leave a matching gap for
 * the learner to repeat.
 */
export class Chanter {
  private player: AudioPlayer | null = null;
  private run = 0;
  private pending: (() => void) | null = null;
  private cues: Partial<Record<Cue, AudioPlayer>> = {};

  /** Short sound cue (bell, chime, tick). Fire-and-forget; never interrupts the lesson. */
  cue(name: Cue) {
    try {
      const p = (this.cues[name] ??= createAudioPlayer(CUES[name]));
      p.seekTo(0);
      p.play();
    } catch {}
  }

  /** Start a new sequence; anything already playing is stopped. Returns its token. */
  begin(): number {
    this.stop();
    return this.run;
  }

  private check(token: number) {
    if (token !== this.run) throw new Cancelled();
  }

  async playUrl(url: string, rate: number, token: number): Promise<number> {
    this.check(token);
    if (!this.player) this.player = createAudioPlayer(null, { updateInterval: 200 });
    const player = this.player;
    const started = Date.now();
    await new Promise<void>((resolve, reject) => {
      let begun = false;
      // If the recording can't load (offline, server down), give up so the caller can fall back.
      const timeout = setTimeout(() => {
        if (begun) return;
        done();
        try {
          player.pause();
        } catch {}
        reject(new Error('audio unavailable'));
      }, 7000);
      const sub = player.addListener('playbackStatusUpdate', (s) => {
        if (s.playing) begun = true;
        if (s.didJustFinish || (begun && !s.playing && s.isLoaded && s.duration > 0 && s.currentTime >= s.duration - 0.05)) {
          done();
          resolve();
        }
      });
      const done = () => {
        clearTimeout(timeout);
        sub.remove();
        this.pending = null;
      };
      this.pending = () => {
        done();
        reject(new Cancelled());
      };
      player.replace({ uri: url });
      player.setPlaybackRate(rate, 'high');
      player.play();
    });
    this.check(token);
    return (Date.now() - started) / 1000;
  }

  async speak(text: string, opts: SpeakOptions, token: number): Promise<number> {
    this.check(token);
    const started = Date.now();
    await new Promise<void>((resolve, reject) => {
      this.pending = () => reject(new Cancelled());
      Speech.speak(text, {
        language: opts.language,
        rate: opts.rate,
        pitch: opts.pitch ?? 1,
        voice: opts.voice,
        onDone: () => resolve(),
        onStopped: () => reject(new Cancelled()),
        onError: () => resolve(), // a missing voice shouldn't freeze the lesson
      });
    });
    this.pending = null;
    this.check(token);
    return (Date.now() - started) / 1000;
  }

  async wait(seconds: number, token: number): Promise<void> {
    this.check(token);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, seconds * 1000);
      this.pending = () => {
        clearTimeout(timer);
        reject(new Cancelled());
      };
    });
    this.pending = null;
    this.check(token);
  }

  stop() {
    this.run += 1;
    this.pending?.();
    this.pending = null;
    Speech.stop().catch(() => {});
    try {
      this.player?.pause();
    } catch {}
  }

  dispose() {
    this.stop();
    for (const p of [this.player, ...Object.values(this.cues)]) {
      try {
        p?.remove();
      } catch {}
    }
    this.player = null;
    this.cues = {};
  }
}

export function useChanter(): Chanter {
  const [chanter] = useState(() => new Chanter());
  useEffect(() => () => chanter.dispose(), [chanter]);
  return chanter;
}
