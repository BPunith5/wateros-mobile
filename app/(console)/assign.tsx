import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Platform,
  RefreshControl, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import StatusPill from '@/src/components/glass/StatusPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import { consoleApi, DeviceRecord } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function statusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'offline': return colors.danger;
    default: return colors.textTertiary;
  }
}

export default function AssignScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await consoleApi.devices();
      setDevices(d);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(d =>
      d.deviceName.toLowerCase().includes(q) ||
      d.deviceId.toLowerCase().includes(q)
    );
  }, [devices, search]);

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const renderDevice = ({ item }: { item: DeviceRecord }) => {
    const adminCount = item.assignedAdminIds?.length ?? 0;
    return (
      <Pressable
        onPress={() => router.push(`/console/sensor-assign/${item._id}` as any)}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      >
        <GlassSurface style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="hardware-chip-outline" size={22} color={colors.aqua} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.deviceName}</Text>
              <Text style={styles.deviceId}>{item.deviceId}</Text>
              <Text style={styles.adminCount}>
                {adminCount === 0
                  ? 'No admins assigned'
                  : `${adminCount} admin${adminCount > 1 ? 's' : ''} assigned`}
              </Text>
            </View>
            <View style={styles.right}>
              <StatusPill label={item.status} color={statusColor(item.status)} />
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginTop: 6 }} />
            </View>
          </View>
        </GlassSurface>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={renderDevice}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aqua} />}
          ListHeaderComponent={
            <View>
              <SectionHeader title="Device Assignments" style={styles.sectionHeader} />
              {/* Search bar */}
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color={colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or ID…"
                  placeholderTextColor={colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                  </Pressable>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.aqua} />
              </View>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="hardware-chip-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>
                  {search ? 'No devices match your search' : 'No devices provisioned yet'}
                </Text>
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
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.sm },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  loader: { paddingTop: spacing.xxl, alignItems: 'center' },
  card: { padding: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(77,232,230,0.1)',
    borderWidth: 1,
    borderColor: `${colors.aqua}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  deviceId: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  adminCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end' },
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
    textAlign: 'center',
  },
});
