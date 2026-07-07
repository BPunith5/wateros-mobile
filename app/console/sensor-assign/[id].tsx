import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Alert,
  Modal, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import StatusPill from '@/src/components/glass/StatusPill';
import LiquidButton from '@/src/components/glass/LiquidButton';
import { consoleApi, AdminRecord, DeviceRecord, AssignedAdmin } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function statusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'offline': return colors.danger;
    default: return colors.textTertiary;
  }
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function SensorAssignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [allAdmins, setAllAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [devices, admins] = await Promise.all([
        consoleApi.devices(),
        consoleApi.admins(),
      ]);
      const found = devices.find(d => d._id === id) ?? null;
      setDevice(found);
      setAllAdmins(admins);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // assignedAdminIds is populated by backend: array of { _id, name, email }
  const assignedAdmins: AssignedAdmin[] = (device?.assignedAdminIds ?? []) as AssignedAdmin[];
  const assignedIds = new Set(assignedAdmins.map(a => a._id));
  const unassignedAdmins = allAdmins.filter(a => !assignedIds.has(a._id));

  const handleAssign = async (admin: AdminRecord) => {
    if (!device) return;
    setActionId(admin._id);
    setShowPicker(false);
    try {
      await consoleApi.assignDevice(device._id, admin._id);
      // Add to local assigned list optimistically
      setDevice(prev => {
        if (!prev) return prev;
        const current = (prev.assignedAdminIds ?? []) as AssignedAdmin[];
        return {
          ...prev,
          assignedAdminIds: [...current, { _id: admin._id, name: admin.name, email: admin.email }],
        };
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to assign admin.');
      load();
    } finally {
      setActionId(null);
    }
  };

  const handleUnassign = (admin: AssignedAdmin) => {
    if (!device) return;
    Alert.alert(
      'Remove Admin',
      `Remove from this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionId(admin._id);
            try {
              await consoleApi.unassignDevice(device._id, admin._id);
              setDevice(prev => {
                if (!prev) return prev;
                const current = (prev.assignedAdminIds ?? []) as AssignedAdmin[];
                return {
                  ...prev,
                  assignedAdminIds: current.filter(a => a._id !== admin._id),
                };
              });
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to remove admin.');
              load();
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loader}>
            <ActivityIndicator color={colors.aqua} size="large" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.root}>
        <OceanBackground />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.title}>Device Not Found</Text>
            <View style={styles.backBtn} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const renderAssigned = ({ item }: { item: AssignedAdmin }) => {
    const isActing = actionId === item._id;
    return (
      <GlassSurface style={styles.adminCard}>
        <View style={styles.adminRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials(item.name)}</Text>
          </View>
          <View style={styles.adminInfo}>
            <Text style={styles.adminName}>{item.name}</Text>
            <Text style={styles.adminEmail}>{item.email}</Text>
          </View>
          <Pressable
            onPress={() => handleUnassign(item)}
            hitSlop={10}
            disabled={isActing}
            style={styles.removeBtn}
          >
            {isActing
              ? <ActivityIndicator size="small" color={colors.danger} />
              : <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
            }
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
          data={assignedAdmins}
          keyExtractor={item => item._id}
          renderItem={renderAssigned}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aqua} />}
          ListHeaderComponent={
            <View>
              {/* Header */}
              <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.title} numberOfLines={1}>Device Assignments</Text>
                <View style={styles.backBtn} />
              </View>

              {/* Device info card */}
              <GlassSurface style={styles.deviceCard}>
                <View style={styles.deviceRow}>
                  <View style={styles.deviceIconWrap}>
                    <Ionicons name="hardware-chip" size={24} color={colors.aqua} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.deviceName}</Text>
                    <Text style={styles.deviceIdText}>{device.deviceId}</Text>
                  </View>
                  <StatusPill label={device.status} color={statusColor(device.status)} />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Ionicons name="battery-half-outline" size={13} color={colors.textTertiary} />
                    <Text style={styles.statText}>{device.battery}%</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="wifi-outline" size={13} color={colors.textTertiary} />
                    <Text style={styles.statText}>{device.signal}%</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="pulse-outline" size={13} color={colors.textTertiary} />
                    <Text style={styles.statText}>{device.healthLevel}</Text>
                  </View>
                </View>
              </GlassSurface>

              {/* Section title + add button */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>
                  Assigned Admins ({assignedAdmins.length})
                </Text>
                <Pressable
                  onPress={() => setShowPicker(true)}
                  disabled={unassignedAdmins.length === 0}
                  style={[
                    styles.addBtn,
                    unassignedAdmins.length === 0 && styles.addBtnDisabled,
                  ]}
                >
                  <Ionicons name="person-add-outline" size={14} color={colors.aqua} />
                  <Text style={styles.addBtnText}>Add Admin</Text>
                </Pressable>
              </View>

              {assignedAdmins.length === 0 && (
                <GlassSurface style={styles.emptyCard}>
                  <Ionicons name="people-outline" size={32} color={colors.textTertiary} />
                  <Text style={styles.emptyText}>No admins assigned yet</Text>
                  <LiquidButton
                    label="Assign First Admin"
                    onPress={() => setShowPicker(true)}
                    icon="person-add-outline"
                    disabled={unassignedAdmins.length === 0}
                    style={styles.emptyBtn}
                  />
                </GlassSurface>
              )}
            </View>
          }
        />
      </SafeAreaView>

      {/* Admin picker modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Administrator</Text>
              <Pressable onPress={() => setShowPicker(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            {unassignedAdmins.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.emptyText}>All admins are already assigned</Text>
              </View>
            ) : (
              unassignedAdmins.map(admin => {
                const isActing = actionId === admin._id;
                return (
                  <Pressable
                    key={admin._id}
                    style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.7 }]}
                    onPress={() => handleAssign(admin)}
                    disabled={isActing}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{initials(admin.name)}</Text>
                    </View>
                    <View style={styles.adminInfo}>
                      <Text style={styles.adminName}>{admin.name}</Text>
                      <Text style={styles.adminEmail}>{admin.email}</Text>
                    </View>
                    {isActing
                      ? <ActivityIndicator size="small" color={colors.aqua} />
                      : <Ionicons name="add-circle-outline" size={20} color={colors.aqua} />
                    }
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  deviceCard: { padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(77,232,230,0.1)',
    borderWidth: 1,
    borderColor: `${colors.aqua}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: { flex: 1 },
  deviceName: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  deviceIdText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(77,232,230,0.1)',
    borderWidth: 1,
    borderColor: `${colors.aqua}44`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.aqua,
  },
  adminCard: { padding: spacing.md },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(77,232,230,0.12)',
    borderWidth: 1,
    borderColor: `${colors.aqua}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.sm,
    color: colors.aqua,
  },
  adminInfo: { flex: 1 },
  adminName: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  adminEmail: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  removeBtn: { padding: 4 },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyBtn: { marginTop: spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#080f1e',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
  },
  modalEmpty: { paddingVertical: spacing.xl, alignItems: 'center' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
});
