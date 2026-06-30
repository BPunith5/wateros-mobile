import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassSurface from '@/src/components/glass/GlassSurface';
import PressableScale from '@/src/components/glass/PressableScale';
import WaterVessel from '@/src/components/water/WaterVessel';
import { colors, radius, spacing, tankTypeMeta, typography } from '@/src/theme/tokens';
import type { TankRecord } from '@/src/lib/api';

type Props = {
  tank: TankRecord;
  waterLevel?: number; // 0-1, defaults to 0.6
  onPress?: () => void;
};

export default function TankListCard({ tank, waterLevel = 0.6, onPress }: Props) {
  const meta = tankTypeMeta[tank.tankType] ?? tankTypeMeta.drinking;

  return (
    <PressableScale onPress={onPress}>
      <GlassSurface style={styles.card}>
        {/* Type gradient accent bar */}
        <LinearGradient
          colors={meta.gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentBar}
        />

        <View style={styles.body}>
          {/* 3D Water Vessel */}
          <View style={styles.vesselWrap}>
            <WaterVessel
              percentage={waterLevel}
              color={meta.accent}
              width={44}
              height={84}
              showBubbles={false}
              showLabel={false}
            />
          </View>

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.typeBadge}>
              <LinearGradient
                colors={meta.gradient as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name={meta.icon as any} size={11} color={colors.textInverse} />
              <Text style={styles.typeLabel}>{meta.label}</Text>
            </View>

            <Text style={styles.name} numberOfLines={1}>{tank.tankName}</Text>

            {tank.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.location} numberOfLines={1}>{tank.location}</Text>
              </View>
            ) : null}

            <View style={styles.capacityChip}>
              <Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.capacityText}>{tank.capacity.toLocaleString()} L</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  vesselWrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 5,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  typeLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 10,
    color: colors.textInverse,
    letterSpacing: 0.2,
  },
  name: {
    fontFamily: typography.fontFamily.headingMedium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  capacityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  capacityText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
