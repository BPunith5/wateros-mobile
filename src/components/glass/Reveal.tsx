import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

const STAGGER_MS = 70;
const BASE_DELAY = 60;

export default function Reveal({ children, index = 0, delay, style }: Props) {
  const computedDelay = delay ?? BASE_DELAY + index * STAGGER_MS;

  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(560)
        .delay(computedDelay)
        .springify()
        .damping(17)
        .stiffness(140)}
      layout={LinearTransition.springify().damping(18).stiffness(160)}
    >
      {children}
    </Animated.View>
  );
}
