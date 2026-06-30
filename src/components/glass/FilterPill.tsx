import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '@/src/theme/tokens';

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export default function FilterPill({ label, active, onPress }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active ? styles.pillActive : styles.pillInactive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: 'rgba(34,211,238,0.15)',
    borderColor: colors.cyan,
  },
  pillInactive: {
    backgroundColor: colors.glassFill,
    borderColor: colors.glassBorder,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
  },
  labelActive: {
    color: colors.cyan,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
});
