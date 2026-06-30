import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, RefreshControl, ScrollView,
  Modal, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OceanBackground from '@/src/components/water/OceanBackground';
import GlassSurface from '@/src/components/glass/GlassSurface';
import FilterPill from '@/src/components/glass/FilterPill';
import SectionHeader from '@/src/components/glass/SectionHeader';
import Reveal from '@/src/components/glass/Reveal';
import AlertCard from '@/src/components/alerts/AlertCard';
import LiquidButton from '@/src/components/glass/LiquidButton';
import { alertsApi, complaintsApi, tanksApi, AlertRecord, AlertSeverity, TankRecord, ComplaintRecord } from '@/src/lib/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Filter = 'all' | AlertSeverity;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [myComplaints, setMyComplaints] = useState<ComplaintRecord[]>([]);
  const [tanks, setTanks] = useState<TankRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  // complaint modal state
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTankId, setSelectedTankId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, complaints, tankList] = await Promise.all([
        alertsApi.list(),
        complaintsApi.mySubmissions(),
        tanksApi.list(),
      ]);
      setAlerts(data);
      setMyComplaints(complaints);
      setTanks(tankList);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const markRead = async (alert: AlertRecord) => {
    if (alert.read) return;
    try {
      await alertsApi.markRead(alert._id, true);
      setAlerts(prev => prev.map(a => a._id === alert._id ? { ...a, read: true } : a));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.read);
    await Promise.all(unread.map(a => alertsApi.markRead(a._id, true).catch(() => {})));
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const submitComplaint = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in the subject and description.');
      return;
    }
    setSubmitting(true);
    try {
      const complaint = await complaintsApi.submit(subject.trim(), description.trim(), selectedTankId || undefined);
      setMyComplaints(prev => [complaint, ...prev]);
      setShowModal(false);
      setSubject('');
      setDescription('');
      setSelectedTankId('');
      Alert.alert('Submitted', 'Your complaint has been sent to the admin team.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = alerts.filter(a => filter === 'all' || a.severity === filter);
  const unread = filtered.filter(a => !a.read);
  const earlier = filtered.filter(a => a.read);
  const totalUnread = alerts.filter(a => !a.read).length;

  const tabBarH = Platform.OS === 'ios' ? 100 : 80;

  return (
    <View style={s.root}>
      <OceanBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarH + spacing.lg }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        >
          {/* Header */}
          <View style={s.headerRow}>
            <View>
              <Text style={s.title}>Alerts</Text>
              <Text style={s.subtitle}>
                {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
              </Text>
            </View>
            <Pressable style={s.reportBtn} onPress={() => setShowModal(true)}>
              <Ionicons name="flag-outline" size={15} color={colors.warning} />
              <Text style={s.reportBtnText}>Report Issue</Text>
            </Pressable>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={s.filterScroll}>
            {FILTERS.map(f => (
              <FilterPill key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
            ))}
          </ScrollView>

          {/* Unread alerts */}
          {unread.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="New" action="Mark all read" onAction={markAllRead} />
              <View style={{ gap: spacing.md }}>
                {unread.map((alert, i) => (
                  <Reveal key={alert._id} index={i}>
                    <AlertCard alert={alert} onPress={() => markRead(alert)} />
                  </Reveal>
                ))}
              </View>
            </View>
          )}

          {/* Earlier alerts */}
          {earlier.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="Earlier" />
              <View style={{ gap: spacing.md }}>
                {earlier.map((alert, i) => (
                  <Reveal key={alert._id} index={unread.length + i}>
                    <AlertCard alert={alert} onPress={() => {}} />
                  </Reveal>
                ))}
              </View>
            </View>
          )}

          {/* My complaints */}
          {myComplaints.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="My Complaints" />
              <View style={{ gap: spacing.sm }}>
                {myComplaints.map(c => {
                  const tankName = typeof c.tankId === 'object' && c.tankId ? c.tankId.tankName : null;
                  return (
                    <GlassSurface key={c._id} style={s.complaintCard}>
                      <View style={s.complaintHeader}>
                        <Ionicons name="flag" size={14} color={c.status === 'resolved' ? colors.success : colors.warning} />
                        <Text style={s.complaintSubject} numberOfLines={1}>{c.subject}</Text>
                        <View style={[s.statusPill, c.status === 'resolved' ? s.resolvedPill : s.openPill]}>
                          <Text style={[s.statusText, { color: c.status === 'resolved' ? colors.success : colors.warning }]}>
                            {c.status}
                          </Text>
                        </View>
                      </View>
                      {tankName && <Text style={s.complaintTank}>{tankName}</Text>}
                      <Text style={s.complaintDesc} numberOfLines={2}>{c.description}</Text>
                      <Text style={s.complaintDate}>{formatDate(c.createdAt)}</Text>
                    </GlassSurface>
                  );
                })}
              </View>
            </View>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && myComplaints.length === 0 && (
            <Reveal index={0}>
              <GlassSurface style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <Ionicons name="checkmark-done" size={28} color={colors.success} />
                </View>
                <Text style={s.emptyTitle}>Nothing here</Text>
                <Text style={s.emptySubtitle}>No alerts right now. Use "Report Issue" if something is wrong.</Text>
              </GlassSurface>
            </Reveal>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Report Issue Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Report an Issue</Text>
                <Pressable onPress={() => setShowModal(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* Tank selector */}
              {tanks.length > 0 && (
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Related Tank (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    <Pressable
                      style={[s.tankPill, !selectedTankId && s.tankPillActive]}
                      onPress={() => setSelectedTankId('')}
                    >
                      <Text style={[s.tankPillText, !selectedTankId && s.tankPillTextActive]}>None</Text>
                    </Pressable>
                    {tanks.map(t => (
                      <Pressable
                        key={t._id}
                        style={[s.tankPill, selectedTankId === t._id && s.tankPillActive]}
                        onPress={() => setSelectedTankId(t._id)}
                      >
                        <Text style={[s.tankPillText, selectedTankId === t._id && s.tankPillTextActive]}>
                          {t.tankName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Subject */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Subject</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Sensor not reporting"
                    placeholderTextColor={colors.textTertiary}
                    value={subject}
                    onChangeText={setSubject}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>Description</Text>
                <View style={[s.inputWrap, s.textareaWrap]}>
                  <TextInput
                    style={[s.input, s.textarea]}
                    placeholder="Describe the problem in detail…"
                    placeholderTextColor={colors.textTertiary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <LiquidButton
                label="Submit Complaint"
                onPress={submitComplaint}
                loading={submitting}
                fullWidth
                icon="flag-outline"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.abyss },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.xl, color: colors.textPrimary },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 7, marginTop: 4,
  },
  reportBtnText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.warning },
  filterScroll: { flexGrow: 0, marginBottom: spacing.lg },
  filterRow: { gap: spacing.sm },
  section: { marginBottom: spacing.xl, gap: spacing.md },
  complaintCard: { padding: spacing.md, gap: spacing.xs },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  complaintSubject: { flex: 1, fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.textPrimary },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  openPill: { backgroundColor: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)' },
  resolvedPill: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  statusText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 10, textTransform: 'capitalize' },
  complaintTank: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary },
  complaintDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textSecondary },
  complaintDate: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textTertiary },
  emptyCard: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.lg, gap: spacing.sm },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.success}1A`, borderWidth: 1, borderColor: `${colors.success}55`, marginBottom: spacing.xs,
  },
  emptyTitle: { fontFamily: typography.fontFamily.headingMedium, fontSize: typography.size.md, color: colors.textPrimary },
  emptySubtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: 'rgba(5,18,40,0.98)', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: spacing.md,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: typography.fontFamily.headingBold, fontSize: typography.size.lg, color: colors.textPrimary },
  field: { gap: spacing.xs },
  fieldLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  tankPill: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tankPillActive: { backgroundColor: 'rgba(77,232,230,0.12)', borderColor: `${colors.cyan}44` },
  tankPillText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.textSecondary },
  tankPillTextActive: { color: colors.cyan, fontFamily: typography.fontFamily.bodyMedium },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  textareaWrap: { minHeight: 90 },
  input: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.textPrimary },
  textarea: { minHeight: 72 },
});
