import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  size?: number;
  color?: string;
  delay?: number;
  duration?: number;
};

export default function PulseRing({ size = 80, color = '#FB7185', delay = 0, duration = 1800 }: Props) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1.6, { duration, easing: Easing.out(Easing.ease) }), -1, false),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
});
