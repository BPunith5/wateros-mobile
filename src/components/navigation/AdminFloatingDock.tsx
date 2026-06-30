import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/src/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = [
  { href: '/devices',    icon: 'hardware-chip-outline' as const, activeIcon: 'hardware-chip' as const },
  { href: '/telemetry',  icon: 'pulse-outline' as const,          activeIcon: 'pulse' as const },
  { href: '/complaints', icon: 'flag-outline' as const,           activeIcon: 'flag' as const },
  { href: '/profile',    icon: 'person-circle-outline' as const,  activeIcon: 'person-circle' as const },
] as const;

const BAR_MARGIN = 16;
const BAR_PADDING = 6;
const BAR_WIDTH = SCREEN_WIDTH - BAR_MARGIN * 2;
const TAB_WIDTH = (BAR_WIDTH - BAR_PADDING * 2) / TABS.length;

export default function AdminFloatingDock() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const activeIndex = Math.max(
    0,
    TABS.findIndex(t => pathname === t.href || pathname.startsWith(t.href + '/')),
  );

  const indicator = useSharedValue(activeIndex);

  useEffect(() => {
    indicator.value = withSpring(activeIndex, { damping: 16, stiffness: 180 });
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicator.value * TAB_WIDTH }],
  }));

  const bottom = insets.bottom + 24;

  return (
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={styles.inner}>
          <Animated.View style={[styles.indicator, indicatorStyle]} />
          {TABS.map((tab, i) => {
            const isActive = i === activeIndex;
            return (
              <Pressable
                key={tab.href}
                style={styles.tab}
                onPress={() => { if (!isActive) router.replace(tab.href as any); }}
                hitSlop={4}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isActive ? colors.teal : colors.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: BAR_MARGIN, right: BAR_MARGIN, alignItems: 'center' },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: 'rgba(3,14,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.xl,
    shadowColor: colors.teal,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  inner: { flexDirection: 'row', padding: BAR_PADDING },
  indicator: {
    position: 'absolute',
    top: BAR_PADDING,
    left: BAR_PADDING,
    width: TAB_WIDTH,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tab: { width: TAB_WIDTH, height: 52, alignItems: 'center', justifyContent: 'center' },
});
