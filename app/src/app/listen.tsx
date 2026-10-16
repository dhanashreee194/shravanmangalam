import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureSurface, Swipe } from '../components/GestureSurface';
import { Halo, PeacockFeather } from '../components/KrishnaBanner';
import { SoundWave } from '../components/Motion';
import { useChanter } from '../lib/chanter';
import { collectionsFor } from '../lib/collections';
import { t } from '../lib/i18n';
import { useLibrary } from '../lib/library';
import { PromptKey } from '../lib/prompts';
import { useSettings } from '../lib/settings';
import { useTheme } from '../lib/theme';
import { pick } from '../lib/types';
import { useLesson } from '../lib/useLesson';

type Level = 'collections' | 'items' | 'lesson';
type Part = { url?: string; text: string };

const EMPTY = { hi: 'अभी कोई पाठ नहीं है।', en: 'Nothing here yet.' };

export default function ListenScreen() {
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const { items, promptUrl } = useLibrary();
  const chanter = useChanter();
  const s = t(lang);

  const groups = collectionsFor(items);
  const [level, setLevel] = useState<Level>('collections');
  const [col, setCol] = useState(0);
  const [pos, setPos] = useState(0);
  const [screenReader, setScreenReader] = useState(false);

  const group = groups[Math.min(col, groups.length - 1)];
  const item = level !== 'collections' ? group?.items[pos] : undefined;
  const lesson = useLesson(level === 'lesson' ? item : undefined, chanter);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);

  /**
   * Speak in the owner's voice (their recordings), phone voice for anything not recorded yet.
   * With a screen reader on, let it speak instead so two voices never overlap.
   */
  const say = (parts: Part[]) => {
    if (screenReader) {
      chanter.stop();
      AccessibilityInfo.announceForAccessibility(parts.map((p) => p.text).join(' '));
    } else lesson.announce(parts);
  };
  const prompt = (key: PromptKey): Part => lesson.prompt(key);
  const collectionPart = (i: number): Part => {
    const g = groups[i];
    return g ? { url: promptUrl(g.collection.prompt, lang), text: g.collection.label[lang] } : { text: EMPTY[lang] };
  };
  const itemPart = (i: number): Part => {
    const it = group?.items[i];
    return it ? { url: it.titleAudio?.[lang], text: pick(it.title, lang) } : { text: EMPTY[lang] };
  };

  // Welcome once, when the library is ready.
  const welcomed = useRef(false);
  useEffect(() => {
    if (welcomed.current || !groups.length) return;
    welcomed.current = true;
    say([prompt('welcome'), collectionPart(0)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length]);

  const edge = () => {
    chanter.cue('tick');
    say([prompt('edge')]);
  };

  const move = (delta: number) => {
    if (level === 'collections') {
      const next = col + delta;
      if (next < 0 || next >= groups.length) return edge();
      chanter.cue('tick');
      setCol(next);
      say([collectionPart(next)]);
    } else if (level === 'items') {
      const next = pos + delta;
      if (!group || next < 0 || next >= group.items.length) return edge();
      chanter.cue('tick');
      setPos(next);
      say([itemPart(next)]);
    } else {
      const next = lesson.idx + delta;
      if (next < 0 || next >= lesson.lines.length) return edge();
      chanter.cue('tick');
      lesson.go(next);
      lesson.playLine(next);
    }
  };

  const open = () => {
    if (level === 'collections') {
      if (!group) return;
      setLevel('items');
      setPos(0);
      say([itemPart(0)]);
    } else if (level === 'items') {
      if (!item) return;
      setLevel('lesson');
      lesson.go(0);
      say([itemPart(pos), prompt('lessonIntro')]);
    } else if (lesson.round > 0) {
      // Double tap during Repeat after me stops it…
      lesson.stop();
    } else {
      // …otherwise it always (re)starts it, even if a single line is playing.
      lesson.repeatAfterMe();
    }
  };

  const back = () => {
    lesson.stop();
    if (level === 'lesson') {
      setLevel('items');
      say([itemPart(pos)]);
    } else if (level === 'items') {
      setLevel('collections');
      say([collectionPart(col)]);
    } else {
      say([prompt('bye')]);
      router.back();
    }
  };

  const repeatCurrent = () => {
    if (level === 'collections') say([collectionPart(col)]);
    else if (level === 'items') say([itemPart(pos)]);
    else if (lesson.busy) lesson.stop();
    else lesson.playLine();
  };

  const help = () => say([prompt(level === 'lesson' ? 'lessonHelp' : 'menuHelp')]);

  const onSwipe = (dir: Swipe) => {
    if (dir === 'right') move(1);
    if (dir === 'left') move(-1);
    if (dir === 'down') back();
    if (dir === 'up') {
      if (level === 'lesson') lesson.playAll();
      else help();
    }
  };
  const onLongPress = () => (level === 'lesson' ? lesson.hearLineMeaning() : help());

  // Screen-reader equivalents: swipe up/down (adjust) = next/previous, double tap = open,
  // two-finger double tap (magic tap) = play/stop, scrub/escape = back.
  const onAction = (name: string) => {
    if (name === 'increment') move(1);
    else if (name === 'decrement') move(-1);
    else if (name === 'activate') open();
    else if (name === 'magicTap') repeatCurrent();
    else if (name === 'escape' || name === 'back') back();
    else if (name === 'playAll') lesson.playAll();
    else if (name === 'meaning') lesson.hearLineMeaning();
    else if (name === 'help') help();
  };

  // What the screen shows (large, high-contrast) for low-vision users and helpers.
  const line = level === 'lesson' ? lesson.lines[lesson.idx] : undefined;
  const heading =
    level === 'collections'
      ? group ? `${group.collection.icon}  ${group.collection.label[lang]}` : EMPTY[lang]
      : level === 'items'
        ? item ? pick(item.title, lang) : EMPTY[lang]
        : line?.text ?? '';
  const sub =
    level === 'collections'
      ? `${col + 1} / ${groups.length}`
      : level === 'items'
        ? `${group?.collection.label[lang]} · ${pos + 1} / ${group?.items.length ?? 0}`
        : `${item ? pick(item.title, lang) : ''} · ${s.lineOf(lesson.idx + 1, lesson.lines.length)}`;
  const status =
    lesson.phase === 'listen' ? `👂 ${s.listen}`
    : lesson.phase === 'yourTurn' ? s.yourTurn
    : lesson.phase === 'together' ? `🎶 ${s.allTogether}`
    : lesson.phase === 'meaning' ? `💬 ${s.meaning}`
    : lesson.phase === 'done' ? s.wellDone
    : '';
  const speaking = lesson.busy && lesson.phase !== 'yourTurn';
  const back_ = lang === 'hi' ? 'वापस' : 'Back';
  const hints =
    level === 'lesson'
      ? ['👆 ' + s.playLine, '👆👆 ' + s.repeatAfterMe, '⬅️ ➡️ ' + s.prev + ' / ' + s.next, '⬆️ ' + s.playAll, '✋ ' + s.meaning, '⬇️ ' + back_]
      : ['⬅️ ➡️ ' + (lang === 'hi' ? 'चुनें' : 'Choose'), '👆👆 ' + (lang === 'hi' ? 'खोलें' : 'Open'), '⬇️ ' + back_, '✋ ' + (lang === 'hi' ? 'मदद' : 'Help')];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={s.exitListen}
            onPress={() => {
              lesson.stop();
              router.back();
            }}
            style={[styles.exit, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={{ color: c.text, fontSize: fs(16), fontWeight: '800' }}>✕ {s.exitListen}</Text>
          </Pressable>
        </View>

        <GestureSurface
          style={styles.surface}
          a11yLabel={`${heading}. ${sub}. ${status}`}
          a11yHint={lesson.prompt(level === 'lesson' ? 'lessonHelp' : 'menuHelp').text}
          a11yActions={[
            { name: 'increment' },
            { name: 'decrement' },
            { name: 'activate' },
            { name: 'magicTap' },
            { name: 'escape' },
            { name: 'back', label: back_ },
            { name: 'help', label: lang === 'hi' ? 'मदद' : 'Help' },
            ...(level === 'lesson'
              ? [
                  { name: 'playAll', label: s.playAll },
                  { name: 'meaning', label: s.meaningOfLine },
                ]
              : []),
          ]}
          onTap={repeatCurrent}
          onDoubleTap={open}
          onLongPress={onLongPress}
          onSwipe={onSwipe}
          onAction={onAction}
        >
          <View style={styles.featherWrap}>
            <Halo size={150} active={speaking} color={lesson.phase === 'yourTurn' ? '#86EFAC' : c.gold} />
            <PeacockFeather size={110} />
          </View>
          <Animated.Text key={`s-${sub}`} entering={FadeIn} style={[styles.sub, { color: c.star, fontSize: fs(17) }]}>
            {sub}
          </Animated.Text>
          <Animated.Text
            key={`h-${heading}`}
            entering={FadeInDown.springify().damping(14)}
            style={[styles.heading, { color: c.text, fontSize: fs(level === 'lesson' ? 32 : 36), lineHeight: fs(50) }]}
          >
            {heading}
          </Animated.Text>
          {line && pick(line.meaning, lang) ? <Text style={[styles.meaning, { color: c.muted, fontSize: fs(18) }]}>{pick(line.meaning, lang)}</Text> : null}
          <View style={{ minHeight: fs(80), alignItems: 'center', gap: 8 }}>
            {status ? (
              <Animated.Text
                key={lesson.phase}
                entering={ZoomIn.springify().damping(10)}
                style={[styles.status, { fontSize: fs(lesson.phase === 'yourTurn' ? 30 : 22), color: lesson.phase === 'yourTurn' ? c.yourTurn : c.star }]}
              >
                {status}
              </Animated.Text>
            ) : null}
            <SoundWave active={speaking} color={c.gold} />
          </View>
        </GestureSurface>

        <View style={[styles.hints, { borderTopColor: c.border }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {hints.map((h) => (
            <Text key={h} style={[styles.hint, { color: c.text, backgroundColor: c.surface, fontSize: fs(14) }]}>
              {h}
            </Text>
          ))}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 4 },
  exit: { minHeight: 48, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, justifyContent: 'center' },
  surface: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  featherWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  sub: { fontWeight: '700', textAlign: 'center' },
  heading: { fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(250,204,21,0.45)', textShadowRadius: 12 },
  meaning: { textAlign: 'center' },
  status: { fontWeight: '900', textAlign: 'center' },
  hints: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, padding: 16, borderTopWidth: 1 },
  hint: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, overflow: 'hidden' },
});
