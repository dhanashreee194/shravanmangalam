import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '../../components/BigButton';
import { CollectionTile, DailyCard, ProgressRing, QuickCard, SectionTitle, Springy, StatTile } from '../../components/Dashboard';
import { useChanter } from '../../lib/chanter';
import { collectionsFor, isKrishna } from '../../lib/collections';
import { t, TYPE_INFO } from '../../lib/i18n';
import { useLibrary } from '../../lib/library';
import { useProgress } from '../../lib/progress';
import { useSettings } from '../../lib/settings';
import { useTheme } from '../../lib/theme';
import { Item, pick } from '../../lib/types';
import { useLesson } from '../../lib/useLesson';

// Open Listen mode automatically only once per app launch, so "back" returns to this screen.
let autoOpened = false;

const dayOfYear = () => {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000);
};
/** Same pick all day, a new one tomorrow. Prefers short Krishna shlokas so it's easy to learn in a day. */
function pickOfTheDay(items: Item[]): Item | undefined {
  const pool = items.filter((i) => i.lines.length <= 4 && isKrishna(i));
  const list = pool.length ? pool : items;
  return list.length ? list[dayOfYear() % list.length] : undefined;
}
// Dincharya: what to chant at each part of the day (prahar).
type Prahar = 'morning' | 'midday' | 'evening' | 'night';
const hasTag = (i: Item, tags: string[]) => i.tags.some((t) => tags.includes(t));
const PRAHARS: Record<Prahar, { icon: string; match: (i: Item) => boolean }> = {
  morning: { icon: '🌅', match: (i) => hasTag(i, ['morning', 'study', 'wisdom', 'beginning', 'teacher']) || i.slug === 'kararavindena' },
  midday: { icon: '☀️', match: (i) => i.type === 'gita' || hasTag(i, ['gita']) },
  evening: { icon: '🪔', match: (i) => hasTag(i, ['evening', 'lamp', 'kirtan', 'naam', 'ram dhun', 'gopi-geet']) || i.type === 'bhajan' },
  night: { icon: '🌙', match: (i) => hasTag(i, ['peace', 'protection', 'kavach', 'surrender', 'health']) },
};
function currentPrahar(): Prahar {
  const h = new Date().getHours();
  return h >= 4 && h < 11 ? 'morning' : h < 16 ? 'midday' : h < 20 ? 'evening' : 'night';
}

const iconFor = (i: Item) => (isKrishna(i) && i.type !== 'gita' ? '🦚' : TYPE_INFO[i.type].icon);
const learn = (id: string) => router.push({ pathname: '/learn/[id]', params: { id } });

export default function Home() {
  const { c, fs } = useTheme();
  const { lang, update, ready, listenOnStart } = useSettings();
  const { items, status, refresh, learned } = useLibrary();
  const { lastItemId, streak, practicedToday } = useProgress();
  const s = t(lang);
  const [screenReader, setScreenReader] = useState(false);
  const [selectedPrahar, setSelectedPrahar] = useState<Prahar | null>(null);

  const daily = pickOfTheDay(items);
  const chanter = useChanter();
  const preview = useLesson(daily, chanter);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready && listenOnStart && !autoOpened && items.length) {
      autoOpened = true;
      router.push('/listen');
    }
  }, [ready, listenOnStart, items.length]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? `🌅 ${s.goodMorning}` : hour < 17 ? `☀️ ${s.goodAfternoon}` : `🌙 ${s.goodEvening}`;
  const learnedCount = items.filter((i) => learned.has(i.id)).length;
  // "Everything" is a link next to the section title rather than a tile.
  const groups = collectionsFor(items).filter((g) => g.collection.key !== 'all');
  const [featured, ...restGroups] = groups;
  const lastItem = items.find((i) => i.id === lastItemId && i.id !== daily?.id);
  const prahar = selectedPrahar ?? currentPrahar();
  const forNow = items
    .filter(PRAHARS[prahar].match)
    .sort((a, b) => Number(learned.has(a.id)) - Number(learned.has(b.id)))
    .slice(0, 10);
  const gitaItems = items.filter((i) => i.type === 'gita');
  const wisdom = gitaItems.length ? gitaItems[(dayOfYear() + 3) % gitaItems.length] : undefined;

  // Pair the remaining collections into rows of two for the bento grid.
  const rows: (typeof groups)[] = [];
  for (let i = 0; i < restGroups.length; i += 2) rows.push(restGroups.slice(i, i + 2));

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {/* Header: greeting + language + settings */}
        <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.muted, fontSize: fs(15), fontWeight: '700' }}>{greeting}</Text>
            <Text accessibilityRole="header" style={{ color: c.text, fontSize: fs(28), fontWeight: '900' }}>
              {s.radhe}
            </Text>
          </View>
          <View style={[styles.langPill, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="radiogroup">
            {(['hi', 'en'] as const).map((l) => {
              const active = lang === l;
              return (
                <Pressable
                  key={l}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={l === 'hi' ? 'हिंदी में अर्थ' : 'Meaning in English'}
                  onPress={() => update({ lang: l })}
                  style={[styles.langBtn, active && { backgroundColor: c.gold }]}
                >
                  <Text style={{ fontSize: fs(15), fontWeight: '900', color: active ? c.onGold : c.text }}>{l === 'hi' ? 'हि' : 'EN'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {screenReader && Platform.OS !== 'web' && (
          <Text accessibilityLiveRegion="polite" style={[styles.note, { color: c.text, backgroundColor: c.surfaceStrong, fontSize: fs(16) }]}>
            🔊 {s.screenReaderOn}
          </Text>
        )}

        {/* Hero: shloka of the day */}
        {daily && (
          <Animated.View entering={FadeInDown.delay(80).springify().damping(15)}>
            <DailyCard
              label={s.shlokaOfDay}
              title={pick(daily.title, lang)}
              firstLine={daily.lines[0]?.text ?? ''}
              meaning={pick(daily.summary, lang)}
              source={daily.source}
              playing={preview.busy}
              listenLabel={s.listenNow}
              learnLabel={s.learnNow}
              onListen={() => (preview.busy ? preview.stop() : preview.playAll())}
              onLearn={() => {
                preview.stop();
                learn(daily.id);
              }}
            />
          </Animated.View>
        )}

        {/* Progress strip */}
        {items.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).springify().damping(15)} style={styles.stats}>
            <StatTile
              a11yLabel={`${learnedCount} / ${items.length} ${s.learnedOf}`}
              top={
                <ProgressRing value={learnedCount / items.length}>
                  <Text style={{ color: c.text, fontSize: fs(15), fontWeight: '900' }}>{learnedCount}</Text>
                </ProgressRing>
              }
              label={`/ ${items.length} ${s.learnedOf}`}
            />
            <StatTile
              a11yLabel={`${streak} ${s.streak}`}
              top={
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28 }}>🔥</Text>
                  <Text style={{ color: c.star, fontSize: fs(22), fontWeight: '900' }}>{streak}</Text>
                </View>
              }
              label={s.streak}
            />
            <StatTile
              a11yLabel={`${s.today}: ${practicedToday ? s.todayDone : s.todayPending}`}
              top={
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28 }}>{practicedToday ? '🪷' : '🌱'}</Text>
                  <Text style={{ color: practicedToday ? c.yourTurn : c.muted, fontSize: fs(15), fontWeight: '900' }}>
                    {practicedToday ? s.todayDone : s.todayPending}
                  </Text>
                </View>
              }
              label={s.today}
            />
          </Animated.View>
        )}

        {/* Continue where you left off */}
        {lastItem && (
          <Animated.View entering={FadeInDown.delay(260).springify().damping(15)}>
            <Springy
              onPress={() => learn(lastItem.id)}
              a11yLabel={`${s.continueLearning}: ${pick(lastItem.title, lang)}`}
              style={[styles.continue, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={[styles.continueIcon, { backgroundColor: 'rgba(45,212,191,0.15)' }]}>
                <Text style={{ fontSize: 26 }}>{iconFor(lastItem)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.peacock, fontSize: fs(13), fontWeight: '800' }}>⏯ {s.continueLearning}</Text>
                <Text style={{ color: c.text, fontSize: fs(18), fontWeight: '900' }} numberOfLines={1}>
                  {pick(lastItem.title, lang)}
                </Text>
              </View>
              <Text style={{ color: c.gold, fontSize: 28 }}>›</Text>
            </Springy>
          </Animated.View>
        )}

        {status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={c.gold} size="large" />
            <Text style={{ color: c.muted, fontSize: fs(16), marginTop: 8 }}>{s.loading}</Text>
          </View>
        )}
        {status === 'offline' && <Text style={{ color: c.muted, fontSize: fs(14), textAlign: 'center' }}>📴 {s.offline}</Text>}
        {status === 'error' && (
          <View style={[styles.errorBox, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={{ color: c.text, fontSize: fs(17), marginBottom: 12 }}>⚠️ {s.cantConnect}</Text>
            <BigButton icon="🔄" label={s.retry} variant="primary" onPress={refresh} />
          </View>
        )}

        {/* Collections — bento grid */}
        {featured && (
          <>
            <SectionTitle
              right={
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${s.all}, ${items.length} ${s.items}`}
                  onPress={() => router.push({ pathname: '/list/[type]', params: { type: 'all' } })}
                  style={styles.seeAll}
                >
                  <Text style={{ color: c.gold, fontSize: fs(15), fontWeight: '800' }}>
                    {s.all} ({items.length}) →
                  </Text>
                </Pressable>
              }
            >
              {s.collections}
            </SectionTitle>
            {[[featured], ...rows].map((row, r) => (
              <Animated.View key={r} entering={FadeInDown.delay(300 + r * 80).springify().damping(15)} style={styles.row}>
                {row.map(({ collection, items: list }) => (
                  <CollectionTile
                    key={collection.key}
                    big={r === 0}
                    icon={collection.icon}
                    label={collection.label[lang]}
                    count={list.length}
                    countLabel={s.items}
                    learned={list.filter((i) => learned.has(i.id)).length}
                    gradient={collection.gradient}
                    tint={collection.tint}
                    onPress={() => {
                      preview.stop();
                      router.push({ pathname: '/list/[type]', params: { type: collection.key } });
                    }}
                  />
                ))}
                {row.length === 1 && r > 0 ? <View style={{ flex: 1 }} /> : null}
              </Animated.View>
            ))}
          </>
        )}

        {/* Shloka game */}
        <Animated.View entering={FadeInDown.delay(380).springify().damping(15)}>
          <Springy
            onPress={() => {
              preview.stop();
              router.push({ pathname: '/quiz/[id]', params: { id: 'any' } });
            }}
            a11yLabel={`${s.gameCardTitle}. ${s.gameCardSub}`}
          >
            <LinearGradient colors={['#7C3AED', '#DB2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.game}>
              <View style={styles.gameOrb} />
              <Text style={{ fontSize: 40 }}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: fs(20), fontWeight: '900' }}>{s.gameCardTitle}</Text>
                <Text style={{ color: 'rgba(255,248,231,0.85)', fontSize: fs(14), fontWeight: '700' }}>{s.gameCardSub}</Text>
              </View>
              <Text style={{ color: c.text, fontSize: 30 }}>›</Text>
            </LinearGradient>
          </Springy>
        </Animated.View>

        {/* Dincharya — the right shlokas for this part of the day */}
        <SectionTitle>{`🕰️ ${s.dincharya}`}</SectionTitle>
        <View style={[styles.prahars, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="radiogroup">
          {(Object.keys(PRAHARS) as Prahar[]).map((p) => {
            const active = p === prahar;
            const now = p === currentPrahar();
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={s[`prahar_${p}`]}
                onPress={() => setSelectedPrahar(p)}
                style={[styles.praharBtn, active && { backgroundColor: c.gold }]}
              >
                <Text style={{ fontSize: 22 }}>{PRAHARS[p].icon}</Text>
                <Text style={{ color: active ? c.onGold : c.text, fontSize: fs(13), fontWeight: '900' }}>{s[`prahar_${p}`]}</Text>
                {now && !active ? <View style={[styles.nowDot, { backgroundColor: c.gold }]} /> : null}
              </Pressable>
            );
          })}
        </View>
        {forNow.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={{ marginHorizontal: -16 }}>
            {forNow.map((i, n) => (
              <Animated.View key={`${prahar}-${i.id}`} entering={FadeInRight.delay(n * 60).springify().damping(15)}>
                <QuickCard
                  icon={iconFor(i)}
                  title={pick(i.title, lang)}
                  line={i.lines[0]?.text ?? ''}
                  lines={`${i.lines.length} ${s.lines}`}
                  done={learned.has(i.id)}
                  tint={isKrishna(i) ? c.peacock : c.lotus}
                  onPress={() => {
                    preview.stop();
                    learn(i.id);
                  }}
                />
              </Animated.View>
            ))}
          </ScrollView>
        )}

        {/* Gita wisdom of the day */}
        {wisdom && (
          <Animated.View entering={FadeInDown.delay(480).springify().damping(15)}>
            <Springy
              onPress={() => learn(wisdom.id)}
              a11yLabel={`${s.gitaWisdom}: ${pick(wisdom.summary, lang)}`}
              style={[styles.wisdom, { borderColor: 'rgba(250,204,21,0.35)', backgroundColor: 'rgba(180,83,9,0.18)' }]}
            >
              <Text style={{ color: c.star, fontSize: fs(14), fontWeight: '900' }}>📖 {s.gitaWisdom} · {wisdom.source}</Text>
              <Text style={{ color: c.text, fontSize: fs(18), lineHeight: fs(28), fontStyle: 'italic', marginTop: 6 }}>“{pick(wisdom.summary, lang)}”</Text>
              <Text style={{ color: c.muted, fontSize: fs(15), marginTop: 8 }}>{wisdom.lines[0]?.text}</Text>
            </Springy>
          </Animated.View>
        )}

        <Text style={{ color: c.muted, fontSize: fs(14), textAlign: 'center', marginTop: 8 }}>{s.blessing}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 140, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  langPill: { flexDirection: 'row', borderRadius: 16, padding: 3, borderWidth: 1 },
  langBtn: { minWidth: 46, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  note: { borderRadius: 14, padding: 12, overflow: 'hidden' },
  stats: { flexDirection: 'row', gap: 10 },
  continue: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, borderWidth: 1 },
  continueIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', padding: 32 },
  errorBox: { borderWidth: 1, borderRadius: 18, padding: 16 },
  row: { flexDirection: 'row', gap: 12 },
  carousel: { paddingHorizontal: 16, gap: 12 },
  wisdom: { borderRadius: 24, borderWidth: 1, padding: 18 },
  game: { borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  gameOrb: { position: 'absolute', right: -30, bottom: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: '#FDE68A', opacity: 0.15 },
  prahars: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, padding: 4, gap: 4 },
  praharBtn: { flex: 1, minHeight: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  nowDot: { position: 'absolute', top: 6, right: 8, width: 7, height: 7, borderRadius: 4 },
  seeAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
