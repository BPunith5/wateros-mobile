import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import SectionHeader from '@/src/components/glass/SectionHeader';
import { consoleApi } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function metricChips(item: any): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [];
  if (item.waterLevel != null)      chips.push({ label: 'Level', value: `${Math.round(item.waterLevel * 100)}%` });
  if (item.ph != null)              chips.push({ label: 'pH', value: item.ph.toFixed(1) });
  if (item.temperature != null)     chips.push({ label: 'Temp', value: `${item.temperature}°C` });
  if (item.dissolvedOxygen != null) chips.push({ label: 'DO', value: `${(item.dissolvedOxygen * 100).toFixed(0)}%` });
  if (item.turbidity != null)       chips.push({ label: 'Turb', value: `${item.turbidity} NTU` });
  if (item.tds != null)             chips.push({ label: 'TDS', value: `${item.tds} ppm` });
  return chips;
}

export default function AuditScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await consoleApi.auditLog();
      // backend returns a raw array of telemetry docs
      setLogs(Array.isArray(res) ? res : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const renderLog = ({ item, index }: { item: any; index: number }) => {
    const chips = metricChips(item);
    const pushedBy = item.pushedBy?.name ?? item.pushedBy ?? 'Unknown';
    const deviceLabel = item.deviceId ?? '—';

    return (
      <GlassSurface style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
          <View style={styles.logMeta}>
            <Text style={styles.action}>Manual Telemetry Push</Text>
            <Text style={styles.deviceId} numberOfLines={1}>{deviceLabel}</Text>
            <Text style={styles.performer}>by {pushedBy}</Text>
          </View>
          <Text style={styles.time}>
            {item.timestamp ? formatDate(item.timestamp) : ''}
          </Text>
        </View>

        {chips.length > 0 && (
          <View style={styles.chipsRow}>
            {chips.map(c => (
              <View key={c.label} style={styles.chip}>
                <Text style={styles.chipLabel}>{c.label}</Text>
                <Text style={styles.chipValue}>{c.value}</Text>
              </View>
            ))}
          </View>
        )}
      </GlassSurface>
    );
  };

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={logs}
          keyExtractor={(item, i) => item._id ?? String(i)}
          renderItem={renderLog}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aqua} />}
          ListHeaderComponent={
            <SectionHeader title="Audit Log" style={styles.sectionHeader} />
          }
          ListEmptyComponent={
            !loading ? (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="reader-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No audit entries yet</Text>
                <Text style={styles.emptySubtext}>Manual telemetry pushes from the admin panel will appear here.</Text>
              </GlassSurface>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <Text style={styles.emptyText}>Loading…</Text>
              </GlassSurface>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.md },
  logCard: { padding: spacing.md, gap: spacing.sm },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(77,232,230,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  indexText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 10,
    color: colors.aqua,
  },
  logMeta: { flex: 1, gap: 2 },
  action: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  deviceId: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  performer: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  time: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    flexShrink: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  chipLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: 9,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipValue: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textPrimary,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
