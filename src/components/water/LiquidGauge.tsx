import React, { useEffect, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography } from '@/src/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  size?: number;
  percentage: number;
  color?: string;
  label?: string;
  value?: string;
  unit?: string;
  icon?: React.ReactNode;
};

export default function LiquidGauge({
  size = 120,
  percentage,
  color = colors.cyan,
  label,
  value,
  unit,
  icon,
}: Props) {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9]/g, '_');

  const fill = useSharedValue(0);
  const phase = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(Math.max(0, Math.min(1, percentage)), {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 3400, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const amplitude = size * 0.045;
    const baseY = size * (1 - fill.value);
    const steps = 10;
    let d = `M0 ${baseY}`;
    for (let i = 1; i <= steps; i++) {
      const x = (size / steps) * i;
      const y = baseY + Math.sin((x / size) * Math.PI * 4 + phase.value) * amplitude;
      d += ` L${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L${size} ${size} L0 ${size} Z`;
    return { d };
  });

  const r = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={`${uid}clip`}>
            <Circle cx={r} cy={r} r={r - 3} />
          </ClipPath>
          <SvgLinearGradient id={`${uid}grad`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.85} />
            <Stop offset="1" stopColor={color} stopOpacity={0.35} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={r}
          cy={r}
          r={r - 1.5}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1.5}
        />
        <AnimatedPath
          animatedProps={animatedProps}
          fill={`url(#${uid}grad)`}
          clipPath={`url(#${uid}clip)`}
        />
        <Circle cx={r} cy={r} r={r - 1.5} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {icon}
        {value !== undefined && (
          <Text style={[styles.value, { fontSize: size * 0.18 }]}>
            {value}
            {unit ? <Text style={styles.unit}>{unit}</Text> : null}
          </Text>
        )}
        {label && (
          <Text style={[styles.label, { fontSize: size * 0.085 }]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: typography.fontFamily.headingBold,
    color: colors.textPrimary,
  },
  unit: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
