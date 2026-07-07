import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Modal, TextInput, Pressable,
  Platform, ScrollView, RefreshControl, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import LiquidButton from '@/src/components/glass/LiquidButton';
import StatusPill from '@/src/components/glass/StatusPill';
import FilterPill from '@/src/components/glass/FilterPill';
import StatCard from '@/src/components/glass/StatCard';
import { devicesApi, tanksApi, telemetryApi, DeviceRecord, TankRecord, TankType } from '@/src/lib/api';
import { getCached, setCached } from '@/src/lib/cache';
import { tankTypeMeta } from '@/src/theme/tokens';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

// ─── wizard step types ───────────────────────────────────────────────────────
type WizardStep = 'identify' | 'tank';
type IdentifyTab = 'code' | 'scan';
type TankMode = 'existing' | 'new';

const TANK_TYPES: TankType[] = ['drinking', 'aquaculture', 'industrial', 'irrigation'];

function statusColor(status: string): string {
  switch (status) {
    case 'active': return colors.success;
    case 'pending': return colors.warning;
    case 'offline': return colors.danger;
    default: return colors.textTertiary;
  }
}

// ─── Device Details Modal ────────────────────────────────────────────────────
function DeviceDetailsModal({
  device, tankName, onClose,
}: { device: DeviceRecord | null; tankName: string | null; onClose: () => void }) {
  if (!device) return null;
  return (
    <Modal visible={!!device} animationType="slide" transparent onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <GlassSurface style={detailStyles.sheet}>
          <View style={detailStyles.handle} />
          <View style={detailStyles.header}>
            <View>
              <Text style={detailStyles.title}>{device.deviceName}</Text>
              <Text style={detailStyles.sub}>{device.deviceId}</Text>
            </View>
            <StatusPill label={device.status} color={statusColor(device.status)} />
          </View>

          <View style={detailStyles.statsRow}>
            <View style={detailStyles.statChip}>
              <Ionicons name="battery-half-outline" size={13} color={colors.textTertiary} />
              <Text style={detailStyles.statText}>{device.battery}% battery</Text>
            </View>
            <View style={detailStyles.statChip}>
              <Ionicons name="wifi-outline" size={13} color={colors.textTertiary} />
              <Text style={detailStyles.statText}>{device.signal}% signal</Text>
            </View>
            <View style={detailStyles.statChip}>
              <Ionicons name="pulse-outline" size={13} color={colors.textTertiary} />
              <Text style={detailStyles.statText}>{device.healthLevel}</Text>
            </View>
          </View>

          <View style={detailStyles.rows}>
            <View style={detailStyles.infoRow}>
              <Text style={detailStyles.infoLabel}>Connected Tank</Text>
              <Text style={detailStyles.infoValue}>{tankName ?? 'None'}</Text>
            </View>
            <View style={detailStyles.divider} />
            <View style={detailStyles.infoRow}>
              <Text style={detailStyles.infoLabel}>Health Score</Text>
              <Text style={detailStyles.infoValue}>{device.healthScore}</Text>
            </View>
            {device.lastSeen && (
              <>
                <View style={detailStyles.divider} />
                <View style={detailStyles.infoRow}>
                  <Text style={detailStyles.infoLabel}>Last Seen</Text>
                  <Text style={detailStyles.infoValue}>
                    {new Date(device.lastSeen).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </>
            )}
            {device.activationPin && (
              <>
                <View style={detailStyles.divider} />
                <View style={detailStyles.infoRow}>
                  <Text style={detailStyles.infoLabel}>Activation PIN</Text>
                  <Text style={detailStyles.infoValue}>{device.activationPin}</Text>
                </View>
              </>
            )}
          </View>

          <LiquidButton label="Close" onPress={onClose} fullWidth variant="ghost" style={detailStyles.closeBtn} />
        </GlassSurface>
      </View>
    </Modal>
  );
}
const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderRadius: radius.xl, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md, backgroundColor: '#080f1e' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.glassBorder, alignSelf: 'center', marginBottom: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.lg, color: colors.textPrimary },
  sub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textSecondary },
  rows: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  infoLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textTertiary },
  infoValue: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.glassBorder },
  closeBtn: {},
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DevicesScreen() {
  const router = useRouter();
  const { addSensor } = useLocalSearchParams<{ addSensor?: string }>();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [tanks, setTanks] = useState<TankRecord[]>([]);
  const [gpsMap, setGpsMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailDevice, setDetailDevice] = useState<DeviceRecord | null>(null);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('identify');
  const [identifyTab, setIdentifyTab] = useState<IdentifyTab>('scan');

  // Step 1 state
  const [registrationCode, setRegistrationCode] = useState('');
  const [typedCode, setTypedCode] = useState('');
  const [activationPin, setActivationPin] = useState('');
  const [codeError, setCodeError] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Tank step state
  const [tankMode, setTankMode] = useState<TankMode>('existing');
  const [connectTankId, setConnectTankId] = useState('');
  const [newTankName, setNewTankName] = useState('');
  const [newTankType, setNewTankType] = useState<TankType>('drinking');
  const [newTankCapacity, setNewTankCapacity] = useState('');
  const [newTankLocation, setNewTankLocation] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  const load = useCallback(async () => {
    const cached = getCached<{ devices: DeviceRecord[]; tanks: TankRecord[]; gps: Record<string, boolean> }>('user-devices');
    if (cached) { setDevices(cached.devices); setTanks(cached.tanks); setGpsMap(cached.gps); setLoading(false); if (cached.tanks.length > 0) setConnectTankId(cached.tanks[0]._id); }

    try {
      const [d, t] = await Promise.all([devicesApi.list(), tanksApi.list()]);
      setDevices(d);
      setTanks(t);
      if (t.length > 0) setConnectTankId(t[0]._id);
      const gps: Record<string, boolean> = {};
      await Promise.all(
        d.filter(dev => dev.status === 'active').map(async dev => {
          try {
            const [log] = await telemetryApi.logs(dev.deviceId, 1);
            gps[dev._id] = !!(log?.lat && log?.lng && log.lat !== 0 && log.lng !== 0);
          } catch {
            gps[dev._id] = false;
          }
        })
      );
      setGpsMap(gps);
      setCached('user-devices', { devices: d, tanks: t, gps });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (addSensor === '1' && !loading) openWizard();
  }, [addSensor, loading]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const openWizard = () => {
    setShowWizard(true);
    setWizardStep('identify');
    setIdentifyTab('scan');
    setRegistrationCode('');
    setTypedCode('');
    setActivationPin('');
    setCodeError('');
    setScanned(false);
    setConnectTankId(tanks.length > 0 ? tanks[0]._id : '');
    setTankMode(tanks.length > 0 ? 'existing' : 'new');
    setNewTankName('');
    setNewTankCapacity('');
    setNewTankLocation('');
    setNewTankType('drinking');
    setConnectError('');
  };

  // ── QR scan handler ──
  const handleQrScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setRegistrationCode(data.trim());
    // Stay on identify step — user still needs to enter PIN
  };

  // ── Connect device to tank ──
  const handleConnect = async () => {
    setConnectError('');
    let resolvedTankId = connectTankId;

    if (tankMode === 'new') {
      if (!newTankName.trim() || !newTankCapacity.trim()) {
        setConnectError('Fill in the tank name and capacity.');
        return;
      }
      setConnecting(true);
      try {
        const created = await tanksApi.create({
          tankName: newTankName.trim(),
          tankType: newTankType,
          capacity: Number(newTankCapacity),
          location: newTankLocation.trim() || undefined,
          description: undefined,
        });
        resolvedTankId = created._id;
      } catch (e: any) {
        setConnectError(e.message ?? 'Failed to create tank.');
        setConnecting(false);
        return;
      }
    } else {
      if (!resolvedTankId) {
        setConnectError('Select a tank.');
        return;
      }
      setConnecting(true);
    }

    try {
      const device = await devicesApi.claim(registrationCode.trim(), activationPin.trim(), resolvedTankId);
      setShowWizard(false);
      setRegistrationCode('');
      setScanned(false);
      load();
      if (device.tankId) {
        router.push(`/tank/${device.tankId}` as any);
      }
    } catch (e: any) {
      setConnectError(e.message ?? 'Connection failed.');
      setConnecting(false);
    }
  };

  const goBack = () => {
    if (wizardStep === 'tank') setWizardStep('identify');
    else setShowWizard(false);
  };

  const tabBarHeight = Platform.OS === 'ios' ? 84 : 64;

  const activeCount = devices.filter(d => d.status === 'active').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const pendingCount = devices.filter(d => d.status === 'pending').length;
  const gpsCount = Object.values(gpsMap).filter(Boolean).length;

  function tankName(tankId: string | null) {
    if (!tankId) return null;
    return tanks.find(t => t._id === tankId)?.tankName ?? null;
  }

  const wizardTitle = wizardStep === 'tank' ? 'Set Up Tank' : 'Connect Device';

  const renderDevice = ({ item }: { item: DeviceRecord }) => {
    const tName = tankName(item.tankId);
    const gps = gpsMap[item._id];
    return (
      <Pressable onPress={() => setDetailDevice(item)} style={({ pressed }) => pressed && styles.pressed}>
        <GlassSurface style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceLeft}>
              <Text style={styles.deviceName}>{item.deviceName}</Text>
              <Text style={styles.deviceId} numberOfLines={1}>{item.deviceId}</Text>
            </View>
            <StatusPill label={item.status} color={statusColor(item.status)} />
          </View>

          <View style={styles.deviceStats}>
            <View style={styles.statChip}>
              <Ionicons name="battery-half-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.statChipText}>{item.battery}%</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="wifi-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.statChipText}>{item.signal}%</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="pulse-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.statChipText}>{item.healthLevel}</Text>
            </View>
            {gps && (
              <View style={styles.statChip}>
                <Ionicons name="navigate-outline" size={12} color={colors.cyan} />
                <Text style={[styles.statChipText, { color: colors.cyan }]}>GPS</Text>
              </View>
            )}
          </View>

          {tName ? (
            <View style={styles.tankBadge}>
              <Ionicons name="layers-outline" size={12} color={colors.teal} />
              <Text style={styles.tankBadgeText}>{tName}</Text>
            </View>
          ) : item.tankId ? (
            <View style={styles.tankBadge}>
              <Ionicons name="layers-outline" size={12} color={colors.cyan} />
              <Text style={styles.tankBadgeText}>Connected to tank</Text>
            </View>
          ) : null}
        </GlassSurface>
      </Pressable>
    );
  };

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
          ListHeaderComponent={
            <View>
              <View style={styles.topRow}>
                <View>
                  <Text style={styles.pageTitle}>Devices</Text>
                  <Text style={styles.pageSubtitle}>{devices.length} registered · {activeCount} active</Text>
                </View>
                <Pressable onPress={openWizard} style={styles.addBtn}>
                  <Ionicons name="add" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* Stat cards */}
              {!loading && devices.length > 0 && (
                <View style={styles.statsRow}>
                  <StatCard icon="hardware-chip-outline" value={activeCount} label="Active" color={colors.success} style={styles.stat} />
                  <StatCard icon="cloud-offline-outline" value={offlineCount} label="Offline" color={offlineCount > 0 ? colors.danger : colors.textTertiary} style={styles.stat} />
                  <StatCard icon="time-outline" value={pendingCount} label="Pending" color={colors.warning} style={styles.stat} />
                  <StatCard icon="navigate-outline" value={gpsCount} label="GPS Active" color={colors.cyan} style={styles.stat} />
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <GlassSurface style={styles.emptyCard}>
                <Ionicons name="hardware-chip-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No devices yet</Text>
                <Text style={styles.emptySub}>Register a device and connect it to a tank to start streaming live readings.</Text>
                <LiquidButton label="Add Device" onPress={openWizard} icon="add-circle-outline" style={styles.emptyBtn} />
              </GlassSurface>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <Text style={styles.emptyText}>Loading...</Text>
              </GlassSurface>
            )
          }
        />
      </SafeAreaView>

      {/* Device Details Modal */}
      <DeviceDetailsModal
        device={detailDevice}
        tankName={tankName(detailDevice?.tankId ?? null)}
        onClose={() => setDetailDevice(null)}
      />

      {/* Add Device Wizard */}
      <Modal visible={showWizard} animationType="slide" transparent onRequestClose={goBack}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
            <GlassSurface style={styles.wizardContent}>
              <View style={styles.wizardHandle} />

              {/* Wizard header */}
              <View style={styles.wizardHeader}>
                {wizardStep !== 'identify' && (
                  <Pressable onPress={goBack} hitSlop={8} style={styles.wizardBack}>
                    <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                  </Pressable>
                )}
                <Text style={styles.wizardTitle}>{wizardTitle}</Text>
                <Pressable onPress={() => setShowWizard(false)} hitSlop={8} style={styles.wizardClose}>
                  <Ionicons name="close" size={20} color={colors.textTertiary} />
                </Pressable>
              </View>

              {/* Step bar */}
              <View style={styles.stepBar}>
                {[1, 2].map(n => {
                  const current = wizardStep === 'identify' ? 1 : 2;
                  const active = n <= current;
                  const done = n < current;
                  return (
                    <React.Fragment key={n}>
                      <View style={[styles.stepCircle, active && { backgroundColor: colors.cyan, borderColor: colors.cyan }]}>
                        {done
                          ? <Ionicons name="checkmark" size={11} color={colors.textInverse} />
                          : <Text style={[styles.stepNum, active && { color: colors.textInverse }]}>{n}</Text>
                        }
                      </View>
                      <Text style={[styles.stepLabel, active && { color: colors.textPrimary }]}>
                        {n === 1 ? 'Identify Device' : 'Set Up Tank'}
                      </Text>
                      {n < 2 && <View style={[styles.stepLine, done && { backgroundColor: colors.cyan }]} />}
                    </React.Fragment>
                  );
                })}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ── identify ── */}
                {wizardStep === 'identify' && (
                  <View style={styles.stepContent}>
                    <GlassSurface style={styles.infoBanner}>
                      <Text style={styles.infoBannerTitle}>Register your device</Text>
                      <Text style={styles.infoBannerSub}>Scan the QR code provided by your administrator, or type the 16-digit registration code printed on it.</Text>
                    </GlassSurface>

                    <View style={styles.tabRow}>
                      <FilterPill label="Scan QR" active={identifyTab === 'scan'} onPress={() => setIdentifyTab('scan')} />
                      <FilterPill label="Enter Code" active={identifyTab === 'code'} onPress={() => { setIdentifyTab('code'); setCodeError(''); }} />
                    </View>

                    {identifyTab === 'scan' ? (
                      <View style={styles.scanSection}>
                        {!cameraPermission?.granted ? (
                          <View style={styles.scanMsgWrap}>
                            <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
                            <Text style={styles.scanMsg}>Camera access needed to scan QR codes.</Text>
                            <Pressable
                              onPress={requestCameraPermission}
                              style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(34,211,238,0.15)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)' }}
                            >
                              <Text style={{ color: colors.cyan, fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, fontWeight: '600' }}>Allow Camera</Text>
                            </Pressable>
                          </View>
                        ) : scanned ? (
                          <GlassSurface style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' }}>
                            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.success }}>QR code scanned</Text>
                              <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary }} numberOfLines={1}>{registrationCode}</Text>
                            </View>
                            <Pressable onPress={() => { setScanned(false); setRegistrationCode(''); setActivationPin(''); }}>
                              <Ionicons name="refresh-outline" size={18} color={colors.textTertiary} />
                            </Pressable>
                          </GlassSurface>
                        ) : (
                          <View style={{ borderRadius: 16, overflow: 'hidden', width: '100%', height: 240 }}>
                            <CameraView
                              style={{ flex: 1 }}
                              facing="back"
                              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                              onBarcodeScanned={handleQrScanned}
                            />
                            <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                              <View style={{ width: 160, height: 160, borderWidth: 2, borderColor: colors.cyan, borderRadius: 12, opacity: 0.8 }} />
                            </View>
                          </View>
                        )}
                        {!scanned && (
                          <Text style={[styles.scanMsg, { marginTop: 10, fontSize: 12 }]}>
                            Point at the QR code provided by your administrator
                          </Text>
                        )}
                        {scanned && (
                          <View style={[styles.inputGroup, { width: '100%', marginTop: spacing.sm }]}>
                            <Text style={styles.inputLabel}>Activation PIN</Text>
                            <View style={styles.inputRow}>
                              <Ionicons name="keypad-outline" size={17} color={colors.textTertiary} style={styles.inputIcon} />
                              <TextInput
                                style={styles.textInput}
                                placeholder="PIN printed on device label"
                                placeholderTextColor={colors.textTertiary}
                                value={activationPin}
                                onChangeText={v => { setActivationPin(v); setCodeError(''); }}
                                selectionColor={colors.cyan}
                                keyboardType="default"
                                autoCorrect={false}
                              />
                            </View>
                            {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
                            <LiquidButton
                              label="Continue to Tank Setup"
                              onPress={() => {
                                if (!activationPin.trim()) { setCodeError('Enter the activation PIN from the device label.'); return; }
                                setWizardStep('tank');
                              }}
                              fullWidth
                              disabled={!activationPin.trim()}
                              style={styles.primaryBtn}
                            />
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Registration Code</Text>
                        <View style={styles.inputRow}>
                          <Ionicons name="scan-outline" size={17} color={colors.textTertiary} style={styles.inputIcon} />
                          <TextInput
                            style={styles.textInput}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            placeholderTextColor={colors.textTertiary}
                            value={typedCode}
                            onChangeText={v => { setTypedCode(v.toUpperCase()); setCodeError(''); }}
                            selectionColor={colors.cyan}
                            autoCapitalize="characters"
                            autoCorrect={false}
                          />
                        </View>
                        <Text style={styles.inputLabel}>Activation PIN</Text>
                        <View style={styles.inputRow}>
                          <Ionicons name="keypad-outline" size={17} color={colors.textTertiary} style={styles.inputIcon} />
                          <TextInput
                            style={styles.textInput}
                            placeholder="PIN printed on device label"
                            placeholderTextColor={colors.textTertiary}
                            value={activationPin}
                            onChangeText={v => { setActivationPin(v); setCodeError(''); }}
                            selectionColor={colors.cyan}
                            keyboardType="default"
                            autoCorrect={false}
                          />
                        </View>
                        <Text style={[styles.infoBannerSub, { marginTop: -4 }]}>
                          Both printed on the device label provided by your administrator.
                        </Text>
                        {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
                        <LiquidButton
                          label="Continue to Tank Setup"
                          onPress={() => {
                            const raw = typedCode.replace(/-/g, '');
                            if (raw.length !== 16) { setCodeError('Enter the full 16-character registration code.'); return; }
                            if (!activationPin.trim()) { setCodeError('Enter the activation PIN from the device label.'); return; }
                            setRegistrationCode(typedCode.trim());
                            setWizardStep('tank');
                          }}
                          fullWidth
                          disabled={typedCode.replace(/-/g, '').length < 16 || !activationPin.trim()}
                          style={styles.primaryBtn}
                        />
                      </View>
                    )}
                  </View>
                )}

                {/* ── tank setup ── */}
                {wizardStep === 'tank' && (
                  <View style={styles.stepContent}>
                    {/* Device confirmation */}
                    {registrationCode ? (
                      <GlassSurface style={styles.sensorConfirm}>
                        <View style={styles.sensorConfirmIcon}>
                          <Ionicons name="qr-code-outline" size={15} color={colors.cyan} />
                        </View>
                        <View style={styles.sensorConfirmInfo}>
                          <Text style={styles.sensorConfirmLabel}>QR code scanned</Text>
                          <Text style={styles.sensorConfirmId} numberOfLines={1}>{registrationCode}</Text>
                        </View>
                      </GlassSurface>
                    ) : null}

                    <Text style={styles.tankQuestion}>Which tank is this device monitoring?</Text>

                    <View style={styles.tabRow}>
                      {tanks.length > 0 && (
                        <FilterPill label="Existing Tank" active={tankMode === 'existing'} onPress={() => setTankMode('existing')} />
                      )}
                      <FilterPill label="New Tank" active={tankMode === 'new'} onPress={() => setTankMode('new')} />
                    </View>

                    {tankMode === 'existing' && tanks.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tankPills}>
                        {tanks.map(t => (
                          <FilterPill key={t._id} label={t.tankName} active={connectTankId === t._id} onPress={() => setConnectTankId(t._id)} />
                        ))}
                      </ScrollView>
                    )}

                    {tankMode === 'new' && (
                      <GlassSurface style={styles.newTankForm}>
                        <Text style={styles.newTankTitle}>New tank details</Text>
                        <Text style={styles.inputLabel}>Tank Name</Text>
                        <View style={styles.inputRow}>
                          <Ionicons name="water-outline" size={17} color={colors.textTertiary} style={styles.inputIcon} />
                          <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Rooftop Drinking Tank"
                            placeholderTextColor={colors.textTertiary}
                            value={newTankName}
                            onChangeText={setNewTankName}
                            selectionColor={colors.cyan}
                          />
                        </View>

                        <Text style={styles.inputLabel}>Tank Type</Text>
                        <View style={styles.miniTypeRow}>
                          {TANK_TYPES.map(type => {
                            const m = tankTypeMeta[type];
                            return (
                              <FilterPill
                                key={type}
                                label={m.label}
                                active={newTankType === type}
                                onPress={() => setNewTankType(type)}
                              />
                            );
                          })}
                        </View>

                        <Text style={styles.inputLabel}>Capacity (Litres)</Text>
                        <View style={styles.inputRow}>
                          <Ionicons name="resize-outline" size={17} color={colors.textTertiary} style={styles.inputIcon} />
                          <TextInput
                            style={styles.textInput}
                            placeholder="e.g. 10000"
                            placeholderTextColor={colors.textTertiary}
                            value={newTankCapacity}
                            onChangeText={setNewTankCapacity}
                            keyboardType="decimal-pad"
                            selectionColor={colors.cyan}
                          />
                        </View>

                        <Text style={styles.inputLabel}>Location (optional)</Text>
                        <View style={styles.inputRow}>
                          <Ionicons name="location-outline" size={17} color={colors.textTertiary} style={styles.inputIcon} />
                          <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Rooftop · Block A"
                            placeholderTextColor={colors.textTertiary}
                            value={newTankLocation}
                            onChangeText={setNewTankLocation}
                            selectionColor={colors.cyan}
                          />
                        </View>
                      </GlassSurface>
                    )}

                    {connectError ? <Text style={styles.errorText}>{connectError}</Text> : null}

                    <LiquidButton
                      label={connecting ? 'Connecting…' : 'Connect Device'}
                      onPress={handleConnect}
                      loading={connecting}
                      fullWidth
                      disabled={connecting
                        || !registrationCode.trim()
                        || (tankMode === 'existing' && !connectTankId)
                        || (tankMode === 'new' && (!newTankName.trim() || !newTankCapacity.trim()))}
                      style={styles.primaryBtn}
                    />
                  </View>
                )}

              </ScrollView>
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
  pressed: { opacity: 0.85 },

  // Header
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.md },
  pageTitle: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.xxl, color: colors.textPrimary },
  pageSubtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },

  // Stat cards
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1 },

  // Device card
  deviceCard: { padding: spacing.md, gap: spacing.sm },
  deviceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  deviceLeft: { flex: 1, marginRight: spacing.sm },
  deviceName: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.textPrimary },
  deviceId: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, marginTop: 2 },
  deviceStats: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  statChipText: { fontFamily: typography.fontFamily.body, fontSize: 11, color: colors.textSecondary },
  tankBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tankBadgeText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.teal },

  // Empty
  emptyCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  emptyText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.textSecondary },
  emptySub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textTertiary, textAlign: 'center' },
  emptyBtn: { marginTop: spacing.sm },

  // Wizard overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%' },
  wizardContent: { borderRadius: radius.xl, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '100%', backgroundColor: '#080f1e' },
  wizardHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.glassBorder, alignSelf: 'center', marginBottom: spacing.sm },
  wizardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  wizardBack: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  wizardTitle: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.xl, color: colors.textPrimary, flex: 1 },
  wizardClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // Step bar
  stepBar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: 4 },
  stepCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 11, color: colors.textTertiary },
  stepLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.textTertiary },
  stepLine: { flex: 1, height: 1, backgroundColor: colors.glassBorder },

  // Step content
  stepContent: { gap: spacing.md, paddingBottom: spacing.lg },
  infoBanner: { padding: spacing.md, gap: 4 },
  infoBannerTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.textPrimary },
  infoBannerSub: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary, lineHeight: 16 },

  // Inputs
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  inputGroup: { gap: spacing.sm },
  inputLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: radius.md, height: 50, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.size.base, color: colors.textPrimary, height: '100%' },
  errorText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.danger },
  primaryBtn: { marginTop: spacing.xs },

  // Camera
  scanSection: { alignItems: 'center', minHeight: 180 },
  scanMsgWrap: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  scanMsg: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
  cameraWrap: { width: '100%', height: 200, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  camera: { flex: 1 },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.cyan },
  cornerTL: { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderRadius: 2 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderRadius: 2 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderRadius: 2 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderRadius: 2 },

  // Tank step
  sensorConfirm: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  sensorConfirmIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.cyan}22`, borderWidth: 1, borderColor: `${colors.cyan}44`, alignItems: 'center', justifyContent: 'center' },
  sensorConfirmInfo: { flex: 1 },
  sensorConfirmLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textSecondary },
  sensorConfirmId: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.textPrimary },
  tankQuestion: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.textPrimary },
  tankPills: { flexGrow: 0 },
  newTankForm: { padding: spacing.md, gap: 4 },
  newTankTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.size.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  miniTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
});
