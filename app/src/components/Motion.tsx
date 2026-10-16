import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

function Bar({ i, active, color }: { i: number; active: boolean; color: string }) {
  const reduce = useReducedMotion();
  const h = useSharedValue(0.25);
  useEffect(() => {
    if (!active || reduce) {
      h.value = withTiming(0.25, { duration: 250 });
      return;
    }
    h.value = withDelay(
      i * 90,
      withRepeat(withSequence(withTiming(0.55 + ((i * 37) % 45) / 100, { duration: 260 + i * 40 }), withTiming(0.2, { duration: 300 + i * 30 })), -1, true),
    );
  }, [active, h, i, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: h.value }] }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

/** Sound wave bars that dance while the voice is playing. */
export function SoundWave({ active, color = colors.gold, bars = 7 }: { active: boolean; color?: string; bars?: number }) {
  return (
    <View style={styles.wave} {...hidden}>
      {Array.from({ length: bars }, (_, i) => (
        <Bar key={i} i={i} active={active} color={color} />
      ))}
    </View>
  );
}

const PETALS = ['🌸', '🪷', '🌼', '🌺', '✨'];
const { width: W, height: H } = Dimensions.get('window');

function Petal({ i, run }: { i: number; run: number }) {
  const y = useSharedValue(-60);
  const x = useSharedValue(0);
  const r = useSharedValue(0);
  const left = useMemo(() => ((i * 53) % 100) / 100, [i]);
  useEffect(() => {
    if (!run) return;
    const delay = (i % 9) * 140;
    const duration = 2600 + (i % 5) * 380;
    y.value = -60;
    y.value = withDelay(delay, withTiming(H + 60, { duration, easing: Easing.in(Easing.quad) }));
    x.value = withDelay(delay, withRepeat(withSequence(withTiming(18, { duration: 600 }), withTiming(-18, { duration: 600 })), -1, true));
    r.value = withDelay(delay, withTiming(360 * (i % 2 ? 1 : -1), { duration }));
  }, [run, i, x, y, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { translateX: x.value }, { rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[styles.petal, { left: left * (W - 30) }, style]}>
      <Text style={{ fontSize: 22 + (i % 3) * 6 }}>{PETALS[i % PETALS.length]}</Text>
    </Animated.View>
  );
}

/** Pushpa vrishti — a shower of flowers when a shloka is learned. Changes `run` to replay. */
export function PetalShower({ run }: { run: number }) {
  const reduce = useReducedMotion();
  if (!run || reduce) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" {...hidden}>
      {Array.from({ length: 22 }, (_, i) => (
        <Petal key={`${run}-${i}`} i={i} run={run} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 34 },
  bar: { width: 5, height: 34, borderRadius: 3 },
  petal: { position: 'absolute', top: 0 },
});
