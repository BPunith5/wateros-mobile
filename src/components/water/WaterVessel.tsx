import React, { useEffect, useId } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, {
  Path, Defs,
  LinearGradient as SvgLinearGradient,
  Stop, ClipPath, Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { typography, colors } from '@/src/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Runs on UI thread — computes SVG wave path string
function buildWavePath(
  W: number, H: number, fill: number, phase: number, ampScale: number,
): string {
  'worklet';
  const baseY = H * (1 - fill);
  const amp = W * 0.04 * ampScale;
  const steps = 24;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const y = baseY + amp * Math.sin((x / W) * 4 * Math.PI + phase);
    d += i === 0
      ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
      : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L ${W} ${H} L 0 ${H} Z`;
}

interface WaterVesselProps {
  percentage: number;   // 0 to 1
  color: string;
  width?: number;
  height?: number;
  onPress?: () => void;
  showBubbles?: boolean;
  showLabel?: boolean;
}

// Fixed per-bubble constants (hooks cannot be called in loops)
const SIZES = [4, 6, 3, 5, 7];
const X_RATIOS = [0.2, 0.45, 0.65, 0.3, 0.8];
const OPACITIES = [0.4, 0.3, 0.5, 0.35, 0.25];
const DURATIONS = [2800, 3400, 2200, 3800, 3100];
const DELAYS = [0, 400, 800, 200, 600];

export default function WaterVessel({
  percentage,
  color,
  width = 120,
  height = 200,
  onPress,
  showBubbles = true,
  showLabel = false,
}: WaterVesselProps) {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9]/g, '_');
  const gradId = `${uid}g`;
  const clipId = `${uid}c`;

  const clamp = Math.min(1, Math.max(0, percentage));
  const level = useSharedValue(clamp);
  const phase1 = useSharedValue(0);
  const phase2 = useSharedValue(Math.PI / 3);
  const rippleScale = useSharedValue(0.1);
  const rippleOpacity = useSharedValue(0);

  // One shared value per bubble (hook rules forbid loops)
  const b0 = useSharedValue(height);
  const b1 = useSharedValue(height);
  const b2 = useSharedValue(height);
  const b3 = useSharedValue(height);
  const b4 = useSharedValue(height);

  // Sync fill level on prop change
  useEffect(() => {
    const target = Math.min(1, Math.max(0, percentage));
    level.value = withTiming(target, {
      duration: 1400,
      easing: Easing.bezier(0.215, 0.61, 0.355, 1),
    });
  }, [percentage]);

  // Start looping animations once on mount
  useEffect(() => {
    phase1.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 4000, easing: Easing.linear }),
      -1, false,
    );
    phase2.value = withRepeat(
      withTiming(Math.PI / 3 + Math.PI * 2, { duration: 3400, easing: Easing.linear }),
      -1, false,
    );

    if (showBubbles) {
      const bubbles = [b0, b1, b2, b3, b4];
      bubbles.forEach((sv, i) => {
        sv.value = withRepeat(
          withDelay(DELAYS[i], withTiming(-SIZES[i], { duration: DURATIONS[i], easing: Easing.linear })),
          -1, false,
        );
      });
    }
  }, []);

  // Animated props for the two wave SVG paths
  const wave1Props = useAnimatedProps(() => ({
    d: buildWavePath(width, height, level.value, phase1.value, 1.0),
  }));
  const wave2Props = useAnimatedProps(() => ({
    d: buildWavePath(width, height, level.value, phase2.value, 0.75),
  }));

  // Bubble animated styles (no loop — hooks must be called at top level)
  const s0 = useAnimatedStyle(() => ({ transform: [{ translateY: b0.value }] }));
  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: b1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: b2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: b3.value }] }));
  const s4 = useAnimatedStyle(() => ({ transform: [{ translateY: b4.value }] }));
  const bubbleStyles = [s0, s1, s2, s3, s4];

  // Ripple animated style
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const handlePress = () => {
    rippleScale.value = 0.1;
    rippleOpacity.value = 0.7;
    rippleScale.value = withTiming(2.5, { duration: 600 });
    rippleOpacity.value = withTiming(0, { duration: 600 });
    onPress?.();
  };

  const rippleSize = width * 0.6;

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      style={[styles.container, { width, height }]}
    >
      {/* SVG animated wave fill */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.9" />
            <Stop offset="1" stopColor={color} stopOpacity="0.45" />
          </SvgLinearGradient>
          <ClipPath id={clipId}>
            <Rect x="0" y="0" width={width} height={height} rx="20" ry="20" />
          </ClipPath>
        </Defs>
        {/* Back wave layer (lighter) */}
        <AnimatedPath
          animatedProps={wave2Props}
          fill={`${color}55`}
          clipPath={`url(#${clipId})`}
        />
        {/* Front wave layer (gradient fill) */}
        <AnimatedPath
          animatedProps={wave1Props}
          fill={`url(#${gradId})`}
          clipPath={`url(#${clipId})`}
        />
      </Svg>

      {/* Rising bubbles */}
      {showBubbles && SIZES.map((size, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: 'absolute',
              top: 0,
              left: X_RATIOS[i] * (width - size),
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: OPACITIES[i],
            },
            bubbleStyles[i],
          ]}
        />
      ))}

      {/* Tap ripple ring */}
      {onPress && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: rippleSize,
              height: rippleSize,
              borderRadius: rippleSize / 2,
              borderWidth: 2,
              borderColor: color,
              left: (width - rippleSize) / 2,
              top: (height - rippleSize) / 2,
            },
            rippleStyle,
          ]}
        />
      )}

      {/* Glass border ring */}
      <View
        style={[styles.border, { width, height, borderColor: `${color}55` }]}
      />

      {/* Optional percentage label */}
      {showLabel && (
        <View style={styles.labelWrap}>
          <Text style={styles.labelText}>{Math.round(clamp * 100)}%</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  labelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
