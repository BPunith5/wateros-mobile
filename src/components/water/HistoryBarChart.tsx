import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import GlassSurface from '@/src/components/glass/GlassSurface';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

export type HistoryPoint = {
  label: string;
  value: number;
};

type Props = {
  data: HistoryPoint[];
  color: string;
  height?: number;
};

export default function HistoryBarChart({ data, color, height = 140 }: Props) {
  const trackHeight = height - 28;

  return (
    <GlassSurface style={styles.card}>
      <View style={[styles.chart, { height }]}>
        {data.map((point, i) => (
          <Bar key={i} point={point} color={color} trackHeight={trackHeight} index={i} />
        ))}
      </View>
    </GlassSurface>
  );
}

function Bar({
  point,
  color,
  trackHeight,
  index,
}: {
  point: HistoryPoint;
  color: string;
  trackHeight: number;
  index: number;
}) {
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(
      index * 80,
      withTiming(Math.max(0.04, point.value), { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    height: fill.value * trackHeight,
  }));

  return (
    <View style={styles.barColumn}>
      <View style={[styles.barTrack, { height: trackHeight }]}>
        <Animated.View style={[styles.barFill, style]}>
          <LinearGradient
            colors={[color, `${color}22`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text style={styles.barLabel}>{point.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    width: '56%',
    justifyContent: 'flex-end',
    borderRadius: radius.pill,
    backgroundColor: colors.glassFill,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
});
