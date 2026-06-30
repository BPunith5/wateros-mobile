import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Platform, RefreshControl,
  Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import SectionHeader from '@/src/components/glass/SectionHeader';
import FilterPill from '@/src/components/glass/FilterPill';
import { complaintsApi, ComplaintRecord, ComplaintStatus } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Filter = 'all' | ComplaintStatus;

export default function ConsoleComplaintsScreen() {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    try {
      const data = await complaintsApi.all();
      setComplaints(data);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const resolve = (complaint: ComplaintRecord) => {
    if (complaint.status === 'resolved') return;
    Alert.alert('Resolve Complaint', `Mark "${complaint.subject}" as resolved?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          setResolvingId(complaint._id);
          try {
            await complaintsApi.updateStatus(complaint._id, 'resolved');
            setComplaints(prev => prev.map(c => c._id === complaint._id ? { ...c, status: 'resolved' } : c));
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to update.');
          } finally {
            setResolvingId(null);
          }
        },
      },
    ]);
  };

  const filtered = complaints.filter(c => filter === 'all' || c.status === filter);
  const openCount = complaints.filter(c => c.status === 'open').length;
  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const renderComplaint = ({ item }: { item: ComplaintRecord }) => {
    const userName = typeof item.userId === 'object' ? item.userId.name : 'User';
    const userEmail = typeof item.userId === 'object' ? item.userId.email : '';
    const tankName = typeof item.tankId === 'object' && item.tankId ? item.tankId.tankName : null;
    const tankLocation = typeof item.tankId === 'object' && item.tankId ? (item.tankId as any).location : null;
    const deviceName = typeof item.deviceMongoId === 'object' && item.deviceMongoId ? item.deviceMongoId.deviceName : null;
    const deviceId = typeof item.deviceMongoId === 'object' && item.deviceMongoId ? item.deviceMongoId.deviceId : null;
    const isResolving = resolvingId === item._id;
    const isResolved = item.status === 'resolved';

    return (
      <GlassSurface style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>
            <View style={[styles.statusPill, isResolved ? styles.resolvedPill : styles.openPill]}>
              <Text style={[styles.statusText, { color: isResolved ? colors.success : colors.warning }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {deviceName && (
              <View style={styles.chipRow}>
                <Ionicons name="hardware-chip-outline" size={11} color={colors.aqua} />
                <Text style={[styles.chipText, { color: colors.aqua }]}>{deviceName}</Text>
                {deviceId && <Text style={styles.chipSub}>{deviceId}</Text>}
              </View>
            )}
            {tankName && (
              <View style={styles.chipRow}>
                <Ionicons name="water-outline" size={11} color={colors.teal} />
                <Text style={[styles.chipText, { color: colors.teal }]}>{tankName}</Text>
              </View>
            )}
            {tankLocation && (
              <View style={styles.chipRow}>
                <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                <Text style={styles.chipText}>{tankLocation}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.subject}>{item.subject}</Text>
        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          {!isResolved && (
            <Pressable
              style={[styles.resolveBtn, isResolving && { opacity: 0.6 }]}
              onPress={() => resolve(item)}
              disabled={isResolving}
            >
              {isResolving
                ? <ActivityIndicator size="small" color={colors.aqua} />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.aqua} />
                    <Text style={styles.resolveBtnText}>Resolve</Text>
                  </>
              }
            </Pressable>
          )}
        </View>
      </GlassSurface>
    );
  };

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={renderComplaint}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aqua} />}
          ListHeaderComponent={
            <View>
              <SectionHeader title="All Complaints" style={styles.sectionHeader} />

              {openCount > 0 && (
                <View style={styles.badge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>{openCount} open complaint{openCount > 1 ? 's' : ''} need attention</Text>
                </View>
              )}

              <View style={styles.filterRow}>
                {(['all', 'open', 'resolved'] as Filter[]).map(f => (
                  <FilterPill key={f} label={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onPress={() => setFilter(f)} />
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="flag-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>
                  {filter !== 'all' ? `No ${filter} complaints` : 'No complaints yet'}
                </Text>
              </GlassSurface>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <ActivityIndicator color={colors.aqua} />
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
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
  badgeText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.warning },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  card: { padding: spacing.md, gap: spacing.sm },
  cardHeader: { gap: spacing.xs },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(77,232,230,0.12)', borderWidth: 1, borderColor: `${colors.aqua}44`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.sm, color: colors.aqua },
  userInfo: { flex: 1 },
  userName: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.textPrimary },
  userEmail: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  openPill: { backgroundColor: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)' },
  resolvedPill: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  statusText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 10, textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary },
  chipSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, opacity: 0.7 },
  subject: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.textPrimary },
  description: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  date: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(77,232,230,0.1)', borderWidth: 1, borderColor: `${colors.aqua}44`,
    borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  resolveBtnText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.aqua },
  emptyCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.base, color: colors.textSecondary },
});
