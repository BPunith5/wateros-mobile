import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';

const BROKER_URL = 'wss://t611713b.ala.asia-southeast1.emqxsl.com:8084/mqtt';
const MQTT_USER = process.env.EXPO_PUBLIC_MQTT_USER ?? 'aquanigha-device';
const MQTT_PASS = process.env.EXPO_PUBLIC_MQTT_PASS ?? '12345678';

export interface LiveTelemetry {
  deviceId: string;
  waterLevel?: number;
  ph?: number;
  temperature?: number;
  battery?: number;
  signal?: number;
  ts: Date;
}

export function useMqttTelemetry(deviceIds: string[], enabled = true) {
  const [telemetry, setTelemetry] = useState<Record<string, LiveTelemetry>>({});
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<ReturnType<typeof mqtt.connect> | null>(null);
  const idsKey = deviceIds.join(',');

  useEffect(() => {
    if (!enabled || !deviceIds.length) return;

    const client = mqtt.connect(BROKER_URL, {
      username: MQTT_USER,
      password: MQTT_PASS,
      clientId: `aquanigha-mobile-${Math.random().toString(36).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 5000,
      rejectUnauthorized: false,
    });

    clientRef.current = client;

    client.on('connect', () => {
      setConnected(true);
      deviceIds.forEach(id => {
        client.subscribe(`aquanigha/${id}/telemetry`, { qos: 0 });
      });
    });

    client.on('message', (topic: string, payload: Buffer) => {
      try {
        const parts = topic.split('/');
        const deviceId = parts[1];
        const data = JSON.parse(payload.toString());
        setTelemetry(prev => ({
          ...prev,
          [deviceId]: { deviceId, ...data, ts: new Date() },
        }));
      } catch { /* ignore malformed */ }
    });

    client.on('disconnect', () => setConnected(false));
    client.on('close', () => setConnected(false));
    client.on('error', () => setConnected(false));

    return () => {
      client.removeAllListeners();
      client.end(true);
      clientRef.current = null;
    };
  }, [idsKey, enabled]);

  return { telemetry, connected };
}
