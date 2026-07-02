import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Modal, TextInput, Platform,
  RefreshControl, KeyboardAvoidingView, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import StatusPill from '@/src/components/glass/StatusPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import LiquidButton from '@/src/components/glass/LiquidButton';
import { consoleApi, DeviceRecord, ProvisionedDeviceResult } from '@/src/lib/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

function statusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'offline': return colors.danger;
    default: return colors.textTertiary;
  }
}

export default function ConsoleDevicesScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showProvision, setShowProvision] = useState(false);
  const [provName, setProvName] = useState('');
  const [provLoading, setProvLoading] = useState(false);
  const [provResult, setProvResult] = useState<ProvisionedDeviceResult | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await consoleApi.devices();
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

  const handleProvision = async () => {
    if (!provName.trim()) {
      Alert.alert('Error', 'Please enter a device name.');
      return;
    }
    setProvLoading(true);
    try {
      const result = await consoleApi.provisionDevice(provName.trim());
      setProvResult(result as ProvisionedDeviceResult);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Provisioning failed.');
    } finally {
      setProvLoading(false);
    }
  };

  const closeModal = () => {
    setShowProvision(false);
    setProvName('');
    setProvResult(null);
    load();
  };

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const renderDevice = ({ item }: { item: DeviceRecord }) => (
    <Pressable
      onPress={() => router.push(`/console/device/${item._id}` as any)}
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
        {item.activationPin && (
          <View style={styles.pinRow}>
            <Ionicons name="key-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.pin}>PIN: {item.activationPin}</Text>
          </View>
        )}
        <View style={styles.footer}>
          <View style={styles.tankRow}>
            <Ionicons
              name={item.tankId ? 'layers-outline' : 'close-circle-outline'}
              size={13}
              color={item.tankId ? colors.teal : colors.textTertiary}
            />
            <Text style={[styles.tankText, item.tankId && { color: colors.teal }]}>
              {item.tankId ? 'Connected to tank' : 'No tank'}
            </Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aqua} />}
          ListHeaderComponent={
            <SectionHeader
              title={`All Devices (${devices.length})`}
              action="Provision"
              onAction={() => setShowProvision(true)}
              style={styles.sectionHeader}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="hardware-chip-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No devices yet</Text>
              </GlassSurface>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <Text style={styles.emptyText}>Loading...</Text>
              </GlassSurface>
            )
          }
        />
      </SafeAreaView>

      {/* Provision Modal */}
      <Modal visible={showProvision} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
            <GlassSurface style={styles.modalContent}>
              <View style={styles.handle} />
              <Text style={styles.modalTitle}>Provision Device</Text>

              {provResult ? (
                <>
                  <GlassSurface style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Device ID</Text>
                    <Text style={styles.resultValue}>{provResult.device.deviceId}</Text>
                    <Text style={styles.resultLabel}>Registration Code</Text>
                    <Text style={styles.resultValue}>{provResult.device.registrationCode ?? provResult.device.activationPin}</Text>
                    {provResult.device.secretKey && (
                      <>
                        <Text style={styles.resultLabel}>Secret Key</Text>
                        <Text style={styles.resultValue}>{provResult.device.secretKey}</Text>
                      </>
                    )}
                  </GlassSurface>
                  <LiquidButton label="Done" onPress={closeModal} fullWidth />
                </>
              ) : (
                <>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Device Name</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="hardware-chip-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Device Unit 01"
                        placeholderTextColor={colors.textTertiary}
                        value={provName}
                        onChangeText={setProvName}
                        selectionColor={colors.cyan}
                        autoFocus
                      />
                    </View>
                  </View>
                  <View style={styles.buttons}>
                    <LiquidButton label="Cancel" onPress={closeModal} variant="ghost" style={styles.halfBtn} />
                    <LiquidButton label="Provision" onPress={handleProvision} loading={provLoading} style={styles.halfBtn} />
                  </View>
                </>
              )}
            </GlassSurface>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pin: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tankText: {
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: { maxHeight: '80%' },
  modalContent: {
    borderRadius: radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  inputWrap: { gap: 6 },
  inputLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    height: '100%',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  halfBtn: { flex: 1 },
  resultCard: { padding: spacing.md, gap: 6 },
  resultLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resultValue: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
