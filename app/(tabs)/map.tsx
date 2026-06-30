import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/src/theme/tokens';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#01040F', '#03142E', '#06294D']} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <Ionicons name="map-outline" size={64} color={colors.aqua} />
        <Text style={styles.title}>Tank Map</Text>
        <Text style={styles.sub}>Interactive map coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontFamily: typography.fontFamily.headingBold, fontSize: 24, color: colors.textPrimary },
  sub: { fontFamily: typography.fontFamily.body, fontSize: 14, color: colors.textSecondary },
});
