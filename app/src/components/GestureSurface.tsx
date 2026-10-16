import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, AccessibilityActionInfo, PanResponder, StyleProp, View, ViewStyle } from 'react-native';

export type Swipe = 'left' | 'right' | 'up' | 'down';

interface Handlers {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipe?: (dir: Swipe) => void;
  /** Screen-reader (TalkBack / VoiceOver) actions, which replace raw gestures while one is on. */
  onAction?: (name: string) => void;
}

interface Props extends Handlers {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  a11yLabel: string;
  a11yHint?: string;
  a11yActions?: AccessibilityActionInfo[];
}

const SWIPE_DISTANCE = 50;
// Generous timing so slower, elderly fingers still register a double tap.
const DOUBLE_TAP_MS = 450;
const LONG_PRESS_MS = 650;

/**
 * The whole screen is one big touch target: tap, double tap, press-and-hold and swipes.
 * No need to find a button — ideal for blind users and shaky hands.
 */
export function GestureSurface({ children, style, a11yLabel, a11yHint, a11yActions, ...handlers }: Props) {
  // Keep the latest handlers in a stable box, so the responder is created only once.
  const handlersRef = useRef<Handlers>(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  // The ref is only read inside touch callbacks (never during render), so this is safe.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    let longTimer: ReturnType<typeof setTimeout> | undefined;
    let tapTimer: ReturnType<typeof setTimeout> | undefined;
    let longFired = false;
    let lastTap = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        longFired = false;
        longTimer = setTimeout(() => {
          longFired = true;
          handlersRef.current.onLongPress?.();
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12) clearTimeout(longTimer);
      },
      onPanResponderRelease: (_, g) => {
        clearTimeout(longTimer);
        if (longFired) return;
        if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) > SWIPE_DISTANCE) {
          const dir: Swipe = Math.abs(g.dx) > Math.abs(g.dy) ? (g.dx > 0 ? 'right' : 'left') : g.dy > 0 ? 'down' : 'up';
          handlersRef.current.onSwipe?.(dir);
          return;
        }
        const now = Date.now();
        if (tapTimer && now - lastTap < DOUBLE_TAP_MS) {
          clearTimeout(tapTimer);
          tapTimer = undefined;
          handlersRef.current.onDoubleTap?.();
          return;
        }
        lastTap = now;
        tapTimer = setTimeout(() => {
          tapTimer = undefined;
          handlersRef.current.onTap?.();
        }, DOUBLE_TAP_MS);
      },
      onPanResponderTerminate: () => clearTimeout(longTimer),
    });
  });

  return (
    <View
      style={style}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
      accessibilityActions={a11yActions}
      onAccessibilityAction={(e: AccessibilityActionEvent) => handlersRef.current.onAction?.(e.nativeEvent.actionName)}
      onAccessibilityEscape={() => handlersRef.current.onAction?.('escape')}
      onMagicTap={() => handlersRef.current.onAction?.('magicTap')}
    >
      {children}
    </View>
  );
}
