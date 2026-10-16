import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ProgressRing } from '../../components/Dashboard';
import { findCollection, isKrishna } from '../../lib/collections';
import { t, TYPE_INFO } from '../../lib/i18n';
import { useLibrary } from '../../lib/library';
import { useSettings } from '../../lib/settings';
import { useTheme } from '../../lib/theme';
import { Item, pick } from '../../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Card({ item, index, tint }: { item: Item; index: number; tint: string }) {
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const { learned, mediaUrl } = useLibrary();
  const s = t(lang);
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const done = learned.has(item.id);
  const voiced = Boolean(item.fullAudioUrl || item.lines.some((l) => l.audioUrl));
  const other = lang === 'hi' ? 'en' : 'hi';
  const main = pick(item.title, lang);
  const sub = item.title[other] && item.title[other] !== main ? item.title[other] : '';

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 55).springify().damping(15)}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`${main}. ${TYPE_INFO[item.type][lang]}. ${item.lines.length} ${s.lines}${done ? '. ⭐' : ''}`}
        onPressIn={() => scale.set(withSpring(0.97))}
        onPressOut={() => scale.set(withSpring(1))}
        onPress={() => router.push({ pathname: '/learn/[id]', params: { id: item.id } })}
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, pressStyle]}
      >
        <View style={[styles.edge, { backgroundColor: tint }]} />
        <View style={[styles.thumb, { backgroundColor: `${tint}22`, borderColor: `${tint}55` }]}>
          {item.imageUrl ? (
            <Image source={{ uri: mediaUrl(item.imageUrl) }} style={styles.img} />
          ) : (
            <Text style={{ fontSize: 30 }}>{isKrishna(item) && item.type !== 'gita' ? '🦚' : TYPE_INFO[item.type].icon}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: fs(19), fontWeight: '800' }}>{main}</Text>
          {sub ? <Text style={{ color: c.muted, fontSize: fs(15) }}>{sub}</Text> : null}
          {item.source ? <Text style={{ color: c.peacock, fontSize: fs(13), fontWeight: '700', marginTop: 2 }}>{item.source}</Text> : null}
          <Text style={{ color: c.muted, fontSize: fs(14), marginTop: 4 }}>
            {item.lines.length} {s.lines}
            {voiced ? '  ·  🎙️' : ''}
          </Text>
        </View>
        {done ? <Text style={{ fontSize: 26 }}>⭐</Text> : <Text style={{ fontSize: 28, color: c.gold }}>›</Text>}
      </AnimatedPressable>
    </Animated.View>
  );
}

type Filter = 'all' | 'todo' | 'done';

export default function ListScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const { items, learned } = useLibrary();
  const s = t(lang);
  const [filter, setFilter] = useState<Filter>('all');

  const collection = findCollection(type);
  const all = items.filter(collection.match);
  const done = all.filter((i) => learned.has(i.id)).length;
  const list = all.filter((i) => (filter === 'all' ? true : filter === 'done' ? learned.has(i.id) : !learned.has(i.id)));

  const header = (
    <View style={{ gap: 14, marginBottom: 4 }}>
      {/* Hero in the collection's own colours */}
      <Animated.View entering={FadeInDown.springify().damping(15)}>
        <LinearGradient colors={[...collection.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { borderColor: `${collection.tint}66` }]}>
          <View style={[styles.heroOrb, { backgroundColor: collection.tint }]} />
          <Text style={{ fontSize: 52 }} importantForAccessibility="no">
            {collection.icon}
          </Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={{ color: c.text, fontSize: fs(26), fontWeight: '900' }}>
              {collection.label[lang]}
            </Text>
            <Text style={{ color: 'rgba(255,248,231,0.85)', fontSize: fs(15), fontWeight: '700' }}>
              {all.length} {s.items} · ⭐ {done} {s.learnedOf}
            </Text>
          </View>
          <ProgressRing value={all.length ? done / all.length : 0} size={62}>
            <Text style={{ color: c.text, fontSize: fs(13), fontWeight: '900' }}>{all.length ? Math.round((done / all.length) * 100) : 0}%</Text>
          </ProgressRing>
        </LinearGradient>
      </Animated.View>

      {/* Filter chips */}
      <View style={[styles.chips, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="radiogroup">
        {(
          [
            ['all', `${s.filterAll} ${all.length}`],
            ['todo', `${s.filterTodo} ${all.length - done}`],
            ['done', `${s.filterDone} ${done}`],
          ] as const
        ).map(([key, label]) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setFilter(key)}
              style={[styles.chip, active && { backgroundColor: c.gold }]}
            >
              <Text style={{ color: active ? c.onGold : c.text, fontSize: fs(14), fontWeight: '800' }} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: collection.label[lang] }} />
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={{ color: c.muted, fontSize: fs(17), textAlign: 'center', padding: 32 }}>{s.empty}</Text>}
        renderItem={({ item, index }) => <Card item={item} index={index} tint={collection.tint} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 26, borderWidth: 1, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  heroOrb: { position: 'absolute', right: -40, top: -40, width: 140, height: 140, borderRadius: 70, opacity: 0.2 },
  chips: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, padding: 4, gap: 4 },
  chip: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingLeft: 18, borderRadius: 20, borderWidth: 1, minHeight: 92, overflow: 'hidden' },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  thumb: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  img: { width: 60, height: 60 },
});
