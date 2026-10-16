import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { t } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import { colors, GOLD, useTheme } from '../lib/theme';
import { Halo, PeacockFeather } from './KrishnaBanner';

const TABS: Record<string, { icon: string; key: 'tabHome' | 'tabJapa' | 'tabGarden' | 'tabSettings' }> = {
  index: { icon: '🏠', key: 'tabHome' },
  japa: { icon: '📿', key: 'tabJapa' },
  garden: { icon: '🌳', key: 'tabGarden' },
  settings: { icon: '⚙️', key: 'tabSettings' },
};

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

function TabButton({ focused, icon, label, onPress }: { focused: boolean; icon: string; label: string; onPress: () => void }) {
  const { c, fs } = useTheme();
  const lift = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 12, stiffness: 180 });
  }, [focused, lift]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * lift.value }, { scale: 1 + 0.15 * lift.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: lift.value, transform: [{ scale: lift.value }] }));
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} onPress={onPress} style={styles.tab}>
      <Animated.Text style={[{ fontSize: 24 }, iconStyle]}>{icon}</Animated.Text>
      <Text style={{ color: focused ? c.gold : c.muted, fontSize: fs(12), fontWeight: focused ? '900' : '700' }} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View style={[styles.dot, { backgroundColor: c.gold }, dotStyle]} />
    </Pressable>
  );
}

/**
 * Our own floating tab bar: Home · Japa · [peacock feather = Listen mode] · Garden · Settings.
 * The raised centre button opens Listen mode — the heart of the app for blind and elderly users.
 */
export function KrishnaTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { c, fs } = useTheme();
  const { lang } = useSettings();
  const s = t(lang);
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const render = (r: (typeof routes)[number]) => {
    const focused = state.routes[state.index]?.key === r.key;
    const meta = TABS[r.name];
    return (
      <TabButton
        key={r.key}
        focused={focused}
        icon={meta.icon}
        label={s[meta.key]}
        onPress={() => {
          tap();
          const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
        }}
      />
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: 'rgba(10,16,52,0.94)', borderColor: c.border }]}>
        {left.map(render)}
        <View style={styles.centerSlot} />
        {right.map(render)}
      </View>
      {/* Raised centre button */}
      {/* Full-width row that ignores touches itself; only the round button is pressable. */}
      <View style={[styles.center, { bottom: Math.max(insets.bottom, 10) + 22 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${s.listenMode}. ${s.listenModeSub}`}
          onPress={() => {
            tap();
            router.push('/listen');
          }}
          style={styles.centerTouch}
        >
          <Halo size={92} color={colors.gold} />
          <LinearGradient colors={[...GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.centerBtn}>
            <PeacockFeather size={46} still />
          </LinearGradient>
          <Text style={{ color: c.gold, fontSize: fs(12), fontWeight: '900', marginTop: 4 }}>{s.tabListen}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 72,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  centerSlot: { width: 84 },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  centerTouch: { alignItems: 'center', width: 92 },
  centerBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0A1034',
    shadowColor: '#FACC15',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
});
