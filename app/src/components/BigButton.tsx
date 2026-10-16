import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GOLD, useTheme } from '../lib/theme';

interface Props {
  icon?: string;
  label: string;
  /** Spoken by TalkBack / VoiceOver; defaults to the label. */
  a11yLabel?: string;
  a11yHint?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  vertical?: boolean;
  /** Optional accent colour for the glass button's edge (e.g. a collection's colour). */
  tint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A large button (at least 64pt tall) that springs when pressed. Primary buttons are pitambar
 * gold; the rest are frosted glass over the night sky.
 */
export function BigButton({ icon, label, a11yLabel, a11yHint, onPress, variant = 'secondary', disabled, style, vertical, tint }: Props) {
  const { c, fs } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fg = variant === 'primary' ? c.onGold : c.text;

  const content = (
    <View style={[styles.inner, vertical && styles.vertical]}>
      {icon ? (
        <Text style={{ fontSize: fs(vertical ? 34 : 24) }} importantForAccessibility="no">
          {icon}
        </Text>
      ) : null}
      {label ? <Text style={[styles.label, { color: fg, fontSize: fs(17) }, vertical && { textAlign: 'center' }]}>{label}</Text> : null}
    </View>
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityHint={a11yHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => scale.set(withSpring(0.95, { damping: 15, stiffness: 300 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 12, stiffness: 220 }))}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[styles.base, disabled && { opacity: 0.4 }, style, pressStyle]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={[...GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, styles.primaryGlow]}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.fill,
            variant === 'secondary' && { backgroundColor: c.surface, borderWidth: 1.5, borderColor: tint ? `${tint}66` : c.border },
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 64, borderRadius: 20 },
  fill: { flex: 1, minHeight: 64, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  primaryGlow: { shadowColor: '#FACC15', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  vertical: { flexDirection: 'column', gap: 6 },
  label: { fontWeight: '800', flexShrink: 1 },
});
