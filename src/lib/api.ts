import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_URL = 'https://wateros-backend.vercel.app/api';
const TOKEN_KEY = 'waterOS_token';

export const getToken = (): Promise<string | null> =>
  Platform.OS === 'web'
    ? Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null)
    : SecureStore.getItemAsync(TOKEN_KEY);

export const setToken = (t: string): Promise<void> =>
  Platform.OS === 'web'
    ? (typeof localStorage !== 'undefined' && localStorage.setItem(TOKEN_KEY, t), Promise.resolve())
    : SecureStore.setItemAsync(TOKEN_KEY, t);

export const removeToken = (): Promise<void> =>
  Platform.OS === 'web'
    ? (typeof localStorage !== 'undefined' && localStorage.removeItem(TOKEN_KEY), Promise.resolve())
    : SecureStore.deleteItemAsync(TOKEN_KEY);

export type UserRole = 'user' | 'admin' | 'superadmin';
export type AuthUser = { _id: string; name: string; email: string; role: UserRole; createdAt: string };
export type TankType = 'drinking' | 'aquaculture' | 'industrial' | 'irrigation';
export type TankRecord = {
  _id: string; userId: string; tankName: string; tankType: TankType;
  capacity: number; location?: string; description?: string; createdAt: string; updatedAt: string;
};
export type DeviceStatus = 'pending' | 'active' | 'offline' | 'unclaimed' | 'decommissioned';
export type HealthLevel = 'healthy' | 'good' | 'warning' | 'critical';
export type AssignedAdmin = { _id: string; name: string; email: string };

export type DeviceRecord = {
  _id: string; deviceId: string; deviceName: string; userId: string | null;
  tankId: string | null; status: DeviceStatus; battery: number; signal: number;
  lastSeen: string | null; activationPin?: string; secretKey?: string;
  registrationCode?: string | null; qrCode?: string;
  healthScore: number; healthLevel: HealthLevel; createdAt: string; updatedAt: string;
  assignedAdminIds?: AssignedAdmin[];
};
export type TelemetryRecord = {
  _id: string; deviceId: string; tankId: string; waterLevel: number; waterQuantity: number;
  dissolvedOxygen: number; ph: number; turbidity: number; tds: number;
  temperature: number; battery: number; signal: number;
  lat?: number; lng?: number; speed?: number;
  timestamp: string;
};
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertTankRef = { _id: string; tankName: string };
export type AlertDeviceRef = { _id: string; deviceId: string; deviceName: string };
export type AlertRecord = {
  _id: string; userId: string; tankId: AlertTankRef | string | null; deviceId: AlertDeviceRef | string; type: string;
  severity: AlertSeverity; title: string; description: string; read: boolean; createdAt: string;
};
export type AdminRecord = { _id: string; name: string; email: string; role: 'admin'; createdAt: string };

export type ComplaintStatus = 'open' | 'resolved';
export type ComplaintRecord = {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  tankId: { _id: string; tankName: string; location?: string } | string | null;
  deviceMongoId?: { _id: string; deviceId: string; deviceName: string } | string | null;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
};
export type PopulatedUser = { _id: string; name: string; email: string };
export type PopulatedTank = { _id: string; tankName: string; location?: string };
export type DeviceDetailRecord = Omit<DeviceRecord, 'userId' | 'tankId'> & {
  userId: PopulatedUser | null;
  tankId: PopulatedTank | null;
  assignedAdminIds: AssignedAdmin[];
  secretKey?: string;
};
export type ProvisionedDeviceResult = { device: DeviceRecord & { secretKey?: string }; qrCodeDataUrl: string };
export type BatchProvisionResult = { devices: (DeviceRecord & { secretKey?: string })[]; csv: string };

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Request failed');
  }
  return res.json();
}

export const authApi = {
  login: (email: string) =>
    req<{ message: string; email: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, otp: string) =>
    req<{ token: string; user: AuthUser }>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  register: (name: string, email: string, password: string) =>
    req<{ token: string; user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => req<{ user: AuthUser }>('/auth/me').then(r => r.user),
};

export const tanksApi = {
  list: () => req<TankRecord[]>('/tanks'),
  get: (id: string) => req<TankRecord>(`/tanks/${id}`),
  create: (data: Omit<TankRecord, '_id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    req<TankRecord>('/tanks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<TankRecord>) =>
    req<TankRecord>(`/tanks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/tanks/${id}`, { method: 'DELETE' }),
};

export const devicesApi = {
  list: () => req<DeviceRecord[]>('/devices'),
  get: (id: string) => req<DeviceRecord>(`/devices/${id}`),
  register: (deviceName: string, tankId?: string) =>
    req<DeviceRecord>('/devices', { method: 'POST', body: JSON.stringify({ deviceName, tankId }) }),
  connect: (deviceId: string, activationPin: string, tankId: string) =>
    req<DeviceRecord>('/devices/connect', { method: 'POST', body: JSON.stringify({ deviceId, activationPin, tankId }) }),
  claim: (registrationCode: string, activationPin: string, tankId: string) =>
    req<DeviceRecord>('/devices/claim', { method: 'POST', body: JSON.stringify({ registrationCode, activationPin, tankId }) }),
  unclaim: (deviceId: string) => req<DeviceRecord>(`/devices/${deviceId}/unclaim`, { method: 'DELETE' }),
};

export const telemetryApi = {
  logs: (deviceId: string, limit = 50) => req<TelemetryRecord[]>(`/logs/${deviceId}?limit=${limit}`),
};

export const alertsApi = {
  list: (severity?: AlertSeverity) =>
    req<AlertRecord[]>(`/alerts${severity ? `?severity=${severity}` : ''}`),
  markRead: (id: string, read = true) =>
    req<AlertRecord>(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ read }) }),
};

export function alertTankId(alert: AlertRecord): string | null {
  if (!alert.tankId) return null;
  if (typeof alert.tankId === 'string') return alert.tankId;
  return alert.tankId._id;
}

export function alertTankName(alert: AlertRecord): string | null {
  if (!alert.tankId || typeof alert.tankId === 'string') return null;
  return alert.tankId.tankName;
}

export type AnalyticsRange = '7D' | '30D' | '90D';
export type AnalyticsSeriesPoint = {
  date: string; waterLevel: number; dissolvedOxygen: number;
  ph: number; turbidity: number; temperature: number;
  battery: number; signal: number; quality: number;
};
export type AnalyticsSummary = {
  avgWaterLevel: number | null; avgQuality: number | null;
  avgTemperature: number | null; avgPh: number | null;
  deviceUptimePercent: number; sampleCount: number;
};
export type AnalyticsDistribution = { type: TankType; count: number };
export type AnalyticsResponse = {
  range: AnalyticsRange; series: AnalyticsSeriesPoint[];
  summary: AnalyticsSummary; distribution: AnalyticsDistribution[];
};

export const analyticsApi = {
  get: (range: AnalyticsRange = '7D', tankId?: string) =>
    req<AnalyticsResponse>(`/analytics?range=${range}${tankId ? `&tankId=${tankId}` : ''}`),
};

export const adminApi = {
  myDevices: () => req<DeviceRecord[]>('/admin/devices'),
  deviceDetail: (id: string) => req<DeviceDetailRecord>(`/admin/devices/${id}`),
  telemetry: (id: string, limit = 50) => req<TelemetryRecord[]>(`/admin/devices/${id}/telemetry?limit=${limit}`),
  pushReading: (id: string, data: Partial<TelemetryRecord>) =>
    req<void>(`/admin/devices/${id}/telemetry`, { method: 'POST', body: JSON.stringify(data) }),
  rotateKey: (id: string) => req<{ secretKey: string }>(`/admin/devices/${id}/rotate-key`, { method: 'POST' }),
};

export const consoleApi = {
  admins: () => req<AdminRecord[]>('/superadmin/admins'),
  createAdmin: (name: string, email: string, password: string) =>
    req<AdminRecord>('/superadmin/admins', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  deleteAdmin: (id: string) => req<void>(`/superadmin/admins/${id}`, { method: 'DELETE' }),
  devices: () => req<DeviceRecord[]>('/superadmin/devices'),
  provisionDevice: (deviceName: string, adminId?: string) =>
    req<ProvisionedDeviceResult>('/superadmin/devices', { method: 'POST', body: JSON.stringify({ deviceName, ...(adminId ? { adminId } : {}) }) }),
  batchProvision: (namePrefix: string, count: number, adminId?: string) =>
    req<BatchProvisionResult>('/superadmin/devices/batch', { method: 'POST', body: JSON.stringify({ namePrefix, count, ...(adminId ? { adminId } : {}) }) }),
  assignDevice: (deviceMongoId: string, adminId: string) =>
    req<void>(`/superadmin/devices/${deviceMongoId}/assign`, { method: 'POST', body: JSON.stringify({ adminId }) }),
  unassignDevice: (deviceMongoId: string, adminId: string) =>
    req<void>(`/superadmin/devices/${deviceMongoId}/assign/${adminId}`, { method: 'DELETE' }),
  listUsers: () => req<AuthUser[]>('/superadmin/users'),
  auditLog: (limit = 50) => req<any[]>(`/superadmin/audit?limit=${limit}`),
  complaints: () => req<ComplaintRecord[]>('/complaints/all'),
  deviceDetail: (id: string) => req<DeviceDetailRecord>(`/superadmin/devices/${id}`),
  deviceTelemetry: (id: string, limit = 20) => req<TelemetryRecord[]>(`/superadmin/devices/${id}/telemetry?limit=${limit}`),
  getDeviceSecret: (deviceMongoId: string) =>
    req<{ secretKey: string }>(`/superadmin/devices/${deviceMongoId}/secret`),
  rotateCode: (deviceMongoId: string) =>
    req<{ registrationCode: string; qrCodeDataUrl: string }>(`/superadmin/devices/${deviceMongoId}/rotate-code`, { method: 'POST' }),
  decommission: (deviceMongoId: string) =>
    req<DeviceRecord>(`/superadmin/devices/${deviceMongoId}/decommission`, { method: 'POST' }),
};

export const complaintsApi = {
  submit: (subject: string, description: string, tankId?: string, deviceMongoId?: string) =>
    req<ComplaintRecord>('/complaints', { method: 'POST', body: JSON.stringify({ subject, description, ...(tankId ? { tankId } : {}), ...(deviceMongoId ? { deviceMongoId } : {}) }) }),
  mySubmissions: () => req<ComplaintRecord[]>('/complaints/my-submissions'),
  mine: () => req<ComplaintRecord[]>('/complaints/mine'),
  all: () => req<ComplaintRecord[]>('/complaints/all'),
  updateStatus: (id: string, status: ComplaintStatus) =>
    req<ComplaintRecord>(`/complaints/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
