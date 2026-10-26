import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Modal, TextInput, Platform,
  RefreshControl, KeyboardAvoidingView, Pressable, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import StatusPill from '@/src/components/glass/StatusPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import LiquidButton from '@/src/components/glass/LiquidButton';
import FilterPill from '@/src/components/glass/FilterPill';
import { consoleApi, DeviceRecord, ProvisionedDeviceResult, BatchProvisionResult } from '@/src/lib/api';
import { getCached, setCached } from '@/src/lib/cache';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

type ProvisionMode = 'single' | 'batch';

function statusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'offline': return colors.danger;
    default: return colors.textTertiary;
  }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <View style={s.copyRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.resultLabel}>{label}</Text>
        <Text style={s.resultValue} numberOfLines={2}>{value}</Text>
      </View>
      <Pressable onPress={copy} style={s.copyBtn} hitSlop={8}>
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? colors.success : colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function ConsoleDevicesScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<ProvisionMode>('single');

  // Single
  const [provName, setProvName] = useState('');
  const [provLoading, setProvLoading] = useState(false);
  const [provResult, setProvResult] = useState<ProvisionedDeviceResult | null>(null);

  // Batch
  const [batchPrefix, setBatchPrefix] = useState('');
  const [batchCount, setBatchCount] = useState('5');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchProvisionResult | null>(null);

  const load = useCallback(async () => {
    const cached = getCached<DeviceRecord[]>('console-devices');
    if (cached) { setDevices(cached); setLoading(false); }

    try {
      const data = await consoleApi.devices();
      setCached('console-devices', data);
      setDevices(data);
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const resetModal = () => {
    setShowModal(false);
    setProvName('');
    setProvResult(null);
    setBatchPrefix('');
    setBatchCount('5');
    setBatchResult(null);
    load();
  };

  const handleSingle = async () => {
    if (!provName.trim()) return;
    setProvLoading(true);
    try {
      const result = await consoleApi.provisionDevice(provName.trim());
      setProvResult(result as ProvisionedDeviceResult);
    } catch (e: any) {
      alert(e.message ?? 'Provisioning failed.');
    } finally {
      setProvLoading(false);
    }
  };

  const handleBatch = async () => {
    const count = parseInt(batchCount, 10);
    if (!batchPrefix.trim() || isNaN(count) || count < 1 || count > 50) return;
    setBatchLoading(true);
    try {
      const result = await consoleApi.batchProvision(batchPrefix.trim(), count);
      setBatchResult(result as BatchProvisionResult);
    } catch (e: any) {
      alert(e.message ?? 'Batch provisioning failed.');
    } finally {
      setBatchLoading(false);
    }
  };

  const tabBarHeight = Platform.OS === 'ios' ? 120 : 100;

  const renderDevice = ({ item }: { item: DeviceRecord }) => (
    <Pressable onPress={() => router.push(`/console/device/${item._id}` as any)} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <GlassSurface style={s.card}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{item.deviceName}</Text>
            <Text style={s.deviceId}>{item.deviceId}</Text>
          </View>
          <StatusPill label={item.status} color={statusColor(item.status)} />
        </View>
        {item.activationPin && (
          <View style={s.pinRow}>
            <Ionicons name="key-outline" size={13} color={colors.textTertiary} />
            <Text style={s.pin}>PIN: {item.activationPin}</Text>
          </View>
        )}
        <View style={s.cardFooter}>
          <View style={s.tankRow}>
            <Ionicons name={item.tankId ? 'layers-outline' : 'close-circle-outline'} size={13} color={item.tankId ? colors.teal : colors.textTertiary} />
            <Text style={[s.tankText, item.tankId && { color: colors.teal }]}>{item.tankId ? 'Connected to tank' : 'No tank'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </View>
      </GlassSurface>
    </Pressable>
  );

  return (
    <View style={s.root}>
      <OceanBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        <FlatList
          data={devices}
          keyExtractor={item => item._id}
          renderItem={renderDevice}
          contentContainerStyle={[s.list, { paddingBottom: tabBarHeight + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aqua} />}
          ListHeaderComponent={
            <SectionHeader
              title={`All Devices (${devices.length})`}
              action="+ Add Device"
              onAction={() => setShowModal(true)}
              style={s.sectionHeader}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <GlassSurface style={s.emptyCard}>
                <Ionicons name="hardware-chip-outline" size={36} color={colors.textTertiary} />
                <Text style={s.emptyText}>No devices yet</Text>
                <Text style={s.emptySub}>Provision a single device or add a batch to get started.</Text>
              </GlassSurface>
            ) : (
              <GlassSurface style={s.emptyCard}><Text style={s.emptyText}>Loading...</Text></GlassSurface>
            )
          }
        />
      </SafeAreaView>

      {/* Add Device Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={resetModal}>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheet}>
            <GlassSurface style={s.modalContent}>
              <View style={s.handle} />

              {provResult ? (
                // ── Single result ──
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={s.modalTitle}>Device Created</Text>
                  <GlassSurface style={s.resultCard}>
                    {provResult.device.qrCode && (
                      <Image source={{ uri: provResult.device.qrCode }} style={s.qrImage} resizeMode="contain" />
                    )}
                    <CopyRow label="Device ID (16-digit)" value={provResult.device.deviceId} />
                    <CopyRow label="Activation PIN" value={provResult.device.activationPin ?? ''} />
                    <CopyRow label="Registration Code" value={provResult.device.registrationCode ?? ''} />
                    {provResult.device.secretKey && (
                      <CopyRow label="Secret Key" value={provResult.device.secretKey} />
                    )}
                  </GlassSurface>
                  <LiquidButton label="Done" onPress={resetModal} fullWidth style={{ marginTop: spacing.md }} />
                </ScrollView>
              ) : batchResult ? (
                // ── Batch result ──
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={s.modalTitle}>{batchResult.devices.length} Devices Created</Text>
                  {batchResult.devices.map((d, i) => (
                    <GlassSurface key={d._id ?? i} style={[s.batchItem]}>
                      <View style={s.batchItemHeader}>
                        <Text style={s.batchItemName}>{d.deviceName}</Text>
                        <Text style={s.batchItemId}>{d.deviceId}</Text>
                      </View>
                      <Text style={s.batchItemPin}>PIN: {d.activationPin}  •  Code: {d.registrationCode}</Text>
                    </GlassSurface>
                  ))}
                  <LiquidButton label="Done" onPress={resetModal} fullWidth style={{ marginTop: spacing.md }} />
                </ScrollView>
              ) : (
                // ── Form ──
                <>
                  <Text style={s.modalTitle}>Add Device</Text>

                  <View style={s.modeRow}>
                    <FilterPill label="Single" active={mode === 'single'} onPress={() => setMode('single')} />
                    <FilterPill label="Batch" active={mode === 'batch'} onPress={() => setMode('batch')} />
                  </View>

                  {mode === 'single' ? (
                    <>
                      <View style={s.inputWrap}>
                        <Text style={s.inputLabel}>Device Name</Text>
                        <View style={s.inputRow}>
                          <Ionicons name="hardware-chip-outline" size={18} color={colors.textTertiary} style={s.inputIcon} />
                          <TextInput
                            style={s.textInput}
                            placeholder="e.g. Rooftop Tank Unit"
                            placeholderTextColor={colors.textTertiary}
                            value={provName}
                            onChangeText={setProvName}
                            selectionColor={colors.cyan}
                            autoFocus
                          />
                        </View>
                      </View>
                      <View style={s.buttons}>
                        <LiquidButton label="Cancel" onPress={resetModal} variant="ghost" style={s.halfBtn} />
                        <LiquidButton label="Create" onPress={handleSingle} loading={provLoading} style={s.halfBtn} />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={s.inputWrap}>
                        <Text style={s.inputLabel}>Name Prefix</Text>
                        <View style={s.inputRow}>
                          <Ionicons name="layers-outline" size={18} color={colors.textTertiary} style={s.inputIcon} />
                          <TextInput
                            style={s.textInput}
                            placeholder="e.g. Tank Unit"
                            placeholderTextColor={colors.textTertiary}
                            value={batchPrefix}
                            onChangeText={setBatchPrefix}
                            selectionColor={colors.cyan}
                            autoFocus
                          />
                        </View>
                        <Text style={s.inputHint}>Devices will be named: "Tank Unit 1", "Tank Unit 2"…</Text>
                      </View>
                      <View style={s.inputWrap}>
                        <Text style={s.inputLabel}>Count (1–50)</Text>
                        <View style={s.inputRow}>
                          <Ionicons name="apps-outline" size={18} color={colors.textTertiary} style={s.inputIcon} />
                          <TextInput
                            style={s.textInput}
                            placeholder="5"
                            placeholderTextColor={colors.textTertiary}
                            value={batchCount}
                            onChangeText={setBatchCount}
                            keyboardType="number-pad"
                            selectionColor={colors.cyan}
                          />
                        </View>
                      </View>
                      <View style={s.buttons}>
                        <LiquidButton label="Cancel" onPress={resetModal} variant="ghost" style={s.halfBtn} />
                        <LiquidButton label={`Create ${batchCount || '?'}`} onPress={handleBatch} loading={batchLoading} style={s.halfBtn} />
                      </View>
                    </>
                  )}
                </>
              )}
            </GlassSurface>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.md },
  card: { padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.textPrimary },
  deviceId: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 2 },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pin: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.textSecondary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tankRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tankText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary },
  emptyCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.base, color: colors.textSecondary },
  emptySub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textTertiary, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%' },
  modalContent: { borderRadius: radius.xl, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md, backgroundColor: '#080f1e' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.glassBorder, alignSelf: 'center', marginBottom: spacing.sm },
  modalTitle: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.xl, color: colors.textPrimary },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  inputWrap: { gap: 6 },
  inputLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.textSecondary },
  inputHint: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: radius.md, height: 52, paddingHorizontal: spacing.md },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.size.base, color: colors.textPrimary, height: '100%' },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  halfBtn: { flex: 1 },
  resultCard: { padding: spacing.md, gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.06)' },
  qrImage: { width: 160, height: 160, alignSelf: 'center', marginBottom: spacing.md, borderRadius: radius.sm, backgroundColor: '#fff' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  resultLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  resultValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.sm, color: colors.textPrimary, marginTop: 2 },
  copyBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.sm },
  batchItem: { padding: spacing.sm, marginBottom: spacing.xs, backgroundColor: 'rgba(255,255,255,0.06)' },
  batchItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batchItemName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.textPrimary },
  batchItemId: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.aqua },
  batchItemPin: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 4 },
});
