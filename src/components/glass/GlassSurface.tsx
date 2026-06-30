import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius } from '@/src/theme/tokens';

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GlassSurface({ children, style }: GlassSurfaceProps) {
  return (
    <View style={[styles.surface, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
  },
});
