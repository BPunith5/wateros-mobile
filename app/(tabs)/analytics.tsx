import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import FilterPill from '@/src/components/glass/FilterPill';
import StatCard from '@/src/components/glass/StatCard';
import SectionHeader from '@/src/components/glass/SectionHeader';
import Reveal from '@/src/components/glass/Reveal';
import LiquidGauge from '@/src/components/water/LiquidGauge';
import HistoryBarChart, { HistoryPoint } from '@/src/components/water/HistoryBarChart';
import {
  analyticsApi, tanksApi, TankRecord,
  AnalyticsRange, AnalyticsSeriesPoint, AnalyticsSummary, AnalyticsDistribution,
} from '@/src/lib/api';
import { colors, radius, spacing, tankTypeMeta, typography } from '@/src/theme/tokens';

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: '90D', label: '90D' },
];

function toHistoryPoints(series: AnalyticsSeriesPoint[], key: keyof AnalyticsSeriesPoint, normalize: (v: number) => number): HistoryPoint[] {
  return series.map((p, i) => {
    const date = new Date(p.date);
    const label = date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 3);
    return { label, value: normalize(p[key] as number) };
  });
}

export default function AnalyticsScreen() {
  const [range, setRange] = useState<AnalyticsRange>('7D');
  const [tanks, setTanks] = useState<TankRecord[]>([]);
  const [series, setSeries] = useState<AnalyticsSeriesPoint[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [distribution, setDistribution] = useState<AnalyticsDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    tanksApi.list().then(setTanks).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await analyticsApi.get(range);
      setSeries(data.series ?? []);
      setSummary(data.summary ?? null);
      setDistribution(data.distribution ?? []);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const tabBarH = Platform.OS === 'ios' ? 100 : 80;

  const levelHistory = toHistoryPoints(series, 'waterLevel', v => v);
  const phHistory = toHistoryPoints(series, 'ph', v => Math.min(1, Math.max(0, (v - 4) / 10)));
  const tempHistory = toHistoryPoints(series, 'temperature', v => Math.min(1, v / 50));
  const doHistory = toHistoryPoints(series, 'dissolvedOxygen', v => v);

  return (
    <View style={s.root}>
      <OceanBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarH + spacing.lg }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Analytics</Text>
            <Text style={s.subtitle}>Insights across {tanks.length} tank{tanks.length !== 1 ? 's' : ''}</Text>
          </View>

          {/* Range selector */}
          <View style={s.rangeRow}>
            {RANGES.map(r => (
              <FilterPill
                key={r.key}
                label={r.label}
                active={range === r.key}
                onPress={() => setRange(r.key)}
              />
            ))}
          </View>

          {/* Overview stats */}
          {summary && (
            <View style={s.statsRow}>
              <Reveal index={0} style={s.statItem}>
                <StatCard
                  icon="water-outline"
                  value={summary.avgWaterLevel != null ? `${Math.round(summary.avgWaterLevel * 100)}%` : '—'}
                  label="Avg Water Level"
                  color={colors.cyan}
                />
              </Reveal>
              <Reveal index={1} style={s.statItem}>
                <StatCard
                  icon="sparkles-outline"
                  value={summary.avgQuality != null ? `${Math.round(summary.avgQuality * 100)}%` : '—'}
                  label="Avg Quality"
                  color={colors.aqua}
                />
              </Reveal>
              <Reveal index={2} style={s.statItem}>
                <StatCard
                  icon="pulse-outline"
                  value={`${Math.round(summary.deviceUptimePercent)}%`}
                  label="Sensor Uptime"
                  color={colors.success}
                />
              </Reveal>
            </View>
          )}

          {series.length === 0 && !loading ? (
            <GlassSurface style={s.emptyCard}>
              <Ionicons name="analytics-outline" size={36} color={colors.textTertiary} />
              <Text style={s.emptyTitle}>No data for this period</Text>
              <Text style={s.emptySub}>Connect a sensor and wait for readings</Text>
            </GlassSurface>
          ) : series.length > 0 ? (
            <>
              {/* Water Level Trend */}
              <Reveal index={3}>
                <View style={s.section}>
                  <SectionHeader title="Water Level Trend" />
                  <HistoryBarChart data={levelHistory} color={colors.cyan} height={160} />
                </View>
              </Reveal>

              {/* Environmental Trends */}
              <Reveal index={4}>
                <View style={s.section}>
                  <SectionHeader title="Environmental Trends" />
                  <View style={s.miniChartsRow}>
                    <View style={s.miniChart}>
                      <Text style={s.miniChartLabel}>pH Level</Text>
                      <HistoryBarChart data={phHistory} color={colors.seafoam} height={120} />
                    </View>
                    <View style={s.miniChart}>
                      <Text style={s.miniChartLabel}>Temperature</Text>
                      <HistoryBarChart data={tempHistory} color={colors.warning} height={120} />
                    </View>
                  </View>
                </View>
              </Reveal>

              {/* Dissolved Oxygen */}
              <Reveal index={5}>
                <View style={s.section}>
                  <SectionHeader title="Dissolved Oxygen" />
                  <HistoryBarChart data={doHistory} color={colors.success} height={140} />
                </View>
              </Reveal>

              {/* Tank comparison */}
              {tanks.length > 0 && summary && (
                <View style={s.section}>
                  <SectionHeader title="Summary Metrics" />
                  <View style={{ gap: spacing.sm }}>
                    {[
                      { label: 'Avg Water Level', value: summary.avgWaterLevel ?? 0, color: colors.cyan, icon: 'water-outline' as const },
                      { label: 'Avg Quality', value: summary.avgQuality ?? 0, color: colors.success, icon: 'sparkles-outline' as const },
                      { label: 'Device Uptime', value: summary.deviceUptimePercent / 100, color: colors.aqua, icon: 'pulse-outline' as const },
                    ].map((item, i) => (
                      <Reveal key={item.label} index={6 + i}>
                        <GlassSurface style={s.compareRow}>
                          <LiquidGauge size={44} percentage={item.value} color={item.color} />
                          <View style={s.compareInfo}>
                            <Text style={s.compareName}>{item.label}</Text>
                          </View>
                          <Text style={[s.comparePercent, { color: item.color }]}>
                            {Math.round(item.value * 100)}%
                          </Text>
                        </GlassSurface>
                      </Reveal>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : null}

          {/* Fleet Distribution */}
          {distribution.length > 0 && (
            <Reveal index={9}>
              <View style={s.section}>
                <SectionHeader title="Fleet Distribution" />
                <GlassSurface style={s.distCard}>
                  {distribution.map(({ type, count }) => {
                    const meta = tankTypeMeta[type] ?? tankTypeMeta.drinking;
                    const total = distribution.reduce((acc, d) => acc + d.count, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <View key={type} style={s.distRow}>
                        <View style={s.distLabelRow}>
                          <View style={[s.distDot, { backgroundColor: meta.accent }]} />
                          <Text style={s.distLabel}>{meta.label}</Text>
                          <Text style={s.distCount}>{count} {count === 1 ? 'tank' : 'tanks'}</Text>
                        </View>
                        <View style={s.distTrack}>
                          <LinearGradient
                            colors={meta.gradient as [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[s.distFill, { width: `${pct}%` as any }]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </GlassSurface>
              </View>
            </Reveal>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.abyss },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statItem: { flex: 1 },
  section: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  miniChartsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniChart: {
    flex: 1,
    gap: 8,
  },
  miniChartLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  compareInfo: {
    flex: 1,
  },
  compareName: {
    fontFamily: typography.fontFamily.headingMedium,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  comparePercent: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
  },
  distCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.lg,
  },
  distRow: {
    gap: 8,
  },
  distLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  distCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  distTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glassFill,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.lg,
    color: colors.textSecondary,
  },
  emptySub: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
