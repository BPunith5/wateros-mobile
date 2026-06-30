import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Platform, RefreshControl, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import StatusPill from '@/src/components/glass/StatusPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import { adminApi, DeviceRecord } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function statusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'offline': return colors.danger;
    default: return colors.textTertiary;
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDevicesScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.myDevices();
      setDevices(data);
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

  const renderDevice = ({ item }: { item: DeviceRecord }) => (
    <Pressable
      onPress={() => router.push(`/admin/device/${item._id}` as any)}
      style={({ pressed }) => pressed && { opacity: 0.8 }}
    >
      <GlassSurface style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.nameSection}>
            <Text style={styles.name}>{item.deviceName}</Text>
            <Text style={styles.deviceId}>{item.deviceId}</Text>
          </View>
          <StatusPill label={item.status} color={statusColor(item.status)} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="battery-half-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.statText}>{item.battery}%</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="wifi-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.statText}>{item.signal}%</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="pulse-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.statText}>{item.healthLevel}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.lastSeen}>
            <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.lastSeenText}>Last seen: {timeAgo(item.lastSeen)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </View>
      </GlassSurface>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={devices}
          keyExtractor={item => item._id}
          renderItem={renderDevice}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          ListHeaderComponent={
            <SectionHeader title="My Devices" style={styles.sectionHeader} />
          }
          ListEmptyComponent={
            !loading ? (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="hardware-chip-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No devices assigned</Text>
              </GlassSurface>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <Text style={styles.emptyText}>Loading...</Text>
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
  card: { padding: spacing.md, gap: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameSection: { flex: 1 },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  deviceId: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastSeen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastSeenText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
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
});
