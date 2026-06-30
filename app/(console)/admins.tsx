import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Alert, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import SectionHeader from '@/src/components/glass/SectionHeader';
import LiquidButton from '@/src/components/glass/LiquidButton';
import { consoleApi, AdminRecord } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function AdminsScreen() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await consoleApi.admins();
      setAdmins(data);
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

  const deleteAdmin = (admin: AdminRecord) => {
    Alert.alert(
      'Remove Administrator',
      `Remove ${admin.name} as an admin? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await consoleApi.deleteAdmin(admin._id);
              setAdmins(prev => prev.filter(a => a._id !== admin._id));
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not remove admin.');
            }
          },
        },
      ]
    );
  };

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const renderAdmin = ({ item }: { item: AdminRecord }) => {
    const initials = item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
      <GlassSurface style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.since}>Admin since {formatDate(item.createdAt)}</Text>
          </View>
          <Pressable
            onPress={() => deleteAdmin(item)}
            hitSlop={10}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </GlassSurface>
    );
  };

  return (
    <View style={styles.root}>
      <OceanBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={admins}
          keyExtractor={item => item._id}
          renderItem={renderAdmin}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aqua} />}
          ListHeaderComponent={
            <View>
              <SectionHeader
                title="Administrators"
                action="Add Admin"
                onAction={() => router.push('/console/create-admin' as any)}
                style={styles.sectionHeader}
              />
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="people-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No administrators yet</Text>
                <LiquidButton
                  label="Add Admin"
                  onPress={() => router.push('/console/create-admin' as any)}
                  icon="add-outline"
                  style={styles.emptyBtn}
                />
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
  card: { padding: spacing.md },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(77,232,230,0.15)',
    borderWidth: 1,
    borderColor: `${colors.aqua}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.base,
    color: colors.aqua,
  },
  info: { flex: 1 },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  email: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  since: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  deleteBtn: { padding: 4 },
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
  emptyBtn: { marginTop: spacing.sm },
});
