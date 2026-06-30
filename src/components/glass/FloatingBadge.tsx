import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import GlassSurface from './GlassSurface';
import { colors, radius, typography } from '@/src/theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  delay?: number;
};

export default function FloatingBadge({ icon, label, color = colors.cyan, style, delay = 0 }: Props) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle, style]}>
      <GlassSurface style={[styles.inner, { borderRadius: radius.pill }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.label}>{label}</Text>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  label: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.xs,
    color: colors.textPrimary,
  },
});
