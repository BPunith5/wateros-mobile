import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius } from '@/src/theme/tokens';

function Dot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 28 : 8);

  useEffect(() => {
    width.value = withSpring(active ? 28 : 8, { damping: 14, stiffness: 180 });
  }, [active]);

  const style = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View style={[styles.dot, style]}>
      {active ? (
        <LinearGradient
          colors={gradients.aquaGlow as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </Animated.View>
  );
}

export default function PaginationDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} active={i === activeIndex} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glassFillStrong,
    overflow: 'hidden',
  },
});
