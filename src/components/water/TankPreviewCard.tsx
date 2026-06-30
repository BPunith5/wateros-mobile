import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassSurface from '@/src/components/glass/GlassSurface';
import PressableScale from '@/src/components/glass/PressableScale';
import StatusPill from '@/src/components/glass/StatusPill';
import WaterVessel from './WaterVessel';
import { colors, radius, spacing, tankTypeMeta, typography } from '@/src/theme/tokens';
import type { TankRecord, TelemetryRecord, DeviceRecord } from '@/src/lib/api';

type Props = {
  tank: TankRecord;
  telemetry: TelemetryRecord | null;
  device: DeviceRecord | null;
  onPress?: () => void;
  width?: number;
};

export default function TankPreviewCard({ tank, telemetry, device, onPress, width = 168 }: Props) {
  const meta = tankTypeMeta[tank.tankType] ?? tankTypeMeta.drinking;
  const level = telemetry?.waterLevel ?? 0;
  const isOnline = device?.status === 'active';

  return (
    <PressableScale onPress={onPress}>
      <GlassSurface style={[styles.card, { width }]}>
        <View style={styles.row}>
          <WaterVessel
            width={52}
            height={104}
            percentage={level}
            color={meta.accent}
            showBubbles={isOnline}
          />
          <View style={styles.info}>
            <View style={[styles.iconBadge, { backgroundColor: `${meta.accent}26`, borderColor: `${meta.accent}55` }]}>
              <Ionicons name={meta.icon as any} size={14} color={meta.accent} />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {tank.tankName}
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              {tank.location ?? meta.label}
            </Text>
            <Text style={[styles.level, { color: meta.accent }]}>
              {Math.round(level * 100)}%
            </Text>
            <StatusPill
              label={isOnline ? 'Online' : 'Offline'}
              color={isOnline ? colors.success : colors.textTertiary}
            />
          </View>
        </View>
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
  },
  name: {
    fontFamily: typography.fontFamily.headingMedium,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  location: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  level: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    marginBottom: 4,
  },
});
