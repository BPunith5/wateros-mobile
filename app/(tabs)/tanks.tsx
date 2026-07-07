import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import FilterPill from '@/src/components/glass/FilterPill';
import Reveal from '@/src/components/glass/Reveal';
import TankListCard from '@/src/components/water/TankListCard';
import { tanksApi, TankRecord, TankType } from '@/src/lib/api';
import { getCached, setCached } from '@/src/lib/cache';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

type Filter = 'all' | TankType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All Tanks' },
  { key: 'drinking', label: 'Drinking Water' },
  { key: 'aquaculture', label: 'Aquaculture' },
  { key: 'industrial', label: 'Industrial' },
  { key: 'irrigation', label: 'Irrigation' },
];

export default function TanksScreen() {
  const router = useRouter(); // used for tank detail navigation
  const [tanks, setTanks] = useState<TankRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    const cached = getCached<TankRecord[]>('tanks');
    if (cached) { setTanks(cached); setLoading(false); }

    try {
      const data = await tanksApi.list();
      setCached('tanks', data);
      setTanks(data);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filteredTanks = filter === 'all' ? tanks : tanks.filter(t => t.tankType === filter);
  const tabBarH = Platform.OS === 'ios' ? 100 : 80;

  return (
    <View style={s.root}>
      <OceanBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Your Tanks</Text>
          <Text style={s.subtitle}>
            {tanks.length} tank{tanks.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={s.filterScroll}
        >
          {FILTERS.map(f => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>

        {/* Tank list */}
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: tabBarH + spacing.lg }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
        >
          {filteredTanks.map((tank, i) => (
            <Reveal key={tank._id} index={i}>
              <TankListCard
                tank={tank}
                onPress={() => router.push(`/tank/${tank._id}` as any)}
              />
            </Reveal>
          ))}

          {!loading && filteredTanks.length === 0 && (
            <GlassSurface style={s.emptyCard}>
              <Text style={s.emptyTitle}>
                {filter === 'all' ? 'No tanks yet' : `No ${filter} tanks`}
              </Text>
              <Text style={s.emptySub}>
                {filter === 'all'
                  ? 'Add your first tank to start monitoring.'
                  : 'Try a different filter or add a new tank.'}
              </Text>
            </GlassSurface>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.abyss },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  filterScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
