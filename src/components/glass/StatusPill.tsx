import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/src/theme/tokens';

interface StatusPillProps {
  label: string;
  color: string;
}

export default function StatusPill({ label, color }: StatusPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    letterSpacing: 0.3,
  },
});
