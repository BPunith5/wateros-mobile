import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassSurface from './GlassSurface';
import PressableScale from './PressableScale';
import { colors, radius, typography } from '@/src/theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  badge?: number;
  size?: number;
};

export default function IconButton({ icon, onPress, badge, size = 44 }: Props) {
  return (
    <PressableScale onPress={onPress} style={styles.wrap}>
      <GlassSurface
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={icon} size={size * 0.45} color={colors.textPrimary} />
      </GlassSurface>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.abyss,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 10,
    color: colors.textPrimary,
  },
});
