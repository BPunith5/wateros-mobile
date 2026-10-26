import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassSurface from '@/src/components/glass/GlassSurface';
import PressableScale from '@/src/components/glass/PressableScale';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import type { AlertRecord, AlertSeverity } from '@/src/lib/api';

const severityMeta: Record<AlertSeverity, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  critical: { icon: 'alert-circle', color: colors.danger },
  warning: { icon: 'warning', color: colors.warning },
  info: { icon: 'information-circle', color: colors.info },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getTankName(alert: AlertRecord): string | null {
  if (!alert.tankId || typeof alert.tankId !== 'object') return null;
  return (alert.tankId as { tankName?: string }).tankName ?? null;
}

type Props = {
  alert: AlertRecord;
  onPress?: () => void;
};

export default function AlertCard({ alert, onPress }: Props) {
  const meta = severityMeta[alert.severity] ?? severityMeta.info;
  const tankName = getTankName(alert);

  return (
    <PressableScale onPress={onPress}>
      <GlassSurface style={styles.card}>
        <View style={[styles.iconBadge, { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}55` }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {alert.title}
            </Text>
            {!alert.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {alert.description}
          </Text>
          <View style={styles.metaRow}>
            {tankName && <Text style={styles.tankName}>{tankName}</Text>}
            {tankName && <Text style={styles.dot}>·</Text>}
            <Text style={styles.timestamp}>{timeAgo(alert.createdAt)}</Text>
          </View>
        </View>
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.headingMedium,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tankName: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  dot: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
  },
  timestamp: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
});
