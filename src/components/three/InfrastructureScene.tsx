/**
 * WaterOS V5 — Matches reference exactly
 * Platform: industrial gear ring + machinery
 * Background: city + industrial towers visible
 * Tanks: glass cylinders + water ripple rings
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { colors, typography } from '@/src/theme/tokens';

export interface TankData {
  tank: { _id: string; tankName: string; tankType: string; capacity: number };
  telemetry: { waterLevel?: number; temperature?: number; ph?: number } | null;
}

interface Props {
  tanks: TankData[];
  onActiveTankChange: (index: number) => void;
  onTankTap: (index: number) => void;
}

const C_BG    = 0x02080f;
const C_WATER = 0x22d3ee;
const C_EDGE  = 0x7dd3fc;
const MIN_SLOTS = 5;
const ORBIT_R   = 1.52;
const PLAT_R    = 1.95;
const TANK_H    = 1.18;
const TANK_R    = 0.22;
const SEG       = 40;
const GHOST_LVL = [0.58, 0.42, 0.75, 0.36, 0.61];

function makeGlowTex(): THREE.DataTexture {
  const S = 128;
  const d = new Uint8Array(4 * S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const dx = (x / S - 0.5) * 2, dy = (y / S - 0.5) * 2;
      const v = Math.pow(Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)), 2.0);
      d[i] = Math.round(34 * v); d[i+1] = Math.round(211 * v);
      d[i+2] = Math.round(238 * v); d[i+3] = Math.round(255 * v);
    }
  }
  const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

interface LabelEntry {
  ax: number; ay: number; bx: number; by: number;
  idx: number; isReal: boolean; name: string; level: number;
}

export default function InfrastructureScene({ tanks, onActiveTankChange, onTankTap }: Props) {
  const { width, height } = useWindowDimensions();
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const platformRef  = useRef<THREE.Group | null>(null);
  const tankGrpsRef  = useRef<THREE.Group[]>([]);
  const waterMshRef  = useRef<THREE.Mesh[]>([]);
  const surfMshRef   = useRef<THREE.Mesh[]>([]);
  const rippleRef    = useRef<THREE.Mesh[][]>([]);
  const glowSprRef   = useRef<THREE.Sprite[]>([]);
  const ptLightRef   = useRef<THREE.PointLight[]>([]);
  const activePlateLightRef = useRef<THREE.PointLight | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef       = useRef<number | null>(null);
  const glRef        = useRef<ExpoWebGLRenderingContext | null>(null);

  const N_SLOTS = Math.max(tanks.length, MIN_SLOTS);
  const baseAngles = useRef(
    Array.from({ length: N_SLOTS }, (_, i) => (2 * Math.PI * i) / N_SLOTS)
  );
  const rotY = useRef(0); const velocity = useRef(0);
  const dragging = useRef(false); const lastTapAt = useRef(0);
  const activeIdxRef = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [labels, setLabels] = useState<LabelEntry[]>([]);

  const sceneH = Math.round(height * 0.65);

  const project = useCallback((p: THREE.Vector3, cam: THREE.PerspectiveCamera) => {
    const v = p.clone().project(cam);
    return { x: ((v.x + 1) / 2) * width, y: ((-v.y + 1) / 2) * sceneH };
  }, [width, sceneH]);

  const getActive = useCallback(() => {
    const rN = Math.max(tanks.length, 1);
    let best = 0, maxZ = -Infinity;
    for (let i = 0; i < rN; i++) {
      const z = Math.cos(baseAngles.current[i] + rotY.current) * ORBIT_R;
      if (z > maxZ) { maxZ = z; best = i; }
    }
    return best;
  }, [tanks.length]);

  const onContextCreate = useCallback(async (gl: ExpoWebGLRenderingContext) => {
    glRef.current = gl;
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas: { width: W, height: H, style: {}, addEventListener: (() => {}) as any,
        removeEventListener: (() => {}) as any, clientHeight: H } as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGLRenderingContext,
    });
    renderer.setPixelRatio(1); renderer.setSize(W, H);
    renderer.setClearColor(C_BG, 1); renderer.sortObjects = true;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(C_BG, 0.018);

    // Camera — lower angle, wider, see more scene
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(0, 2.6, 5.2);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0x163858, 0x020810, 1.8));
    const key = new THREE.DirectionalLight(0x4ab8d8, 0.55);
    key.position.set(3, 8, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0x0a3a5c, 0.25);
    fill.position.set(-5, 2, -6); scene.add(fill);

    const glowTex = makeGlowTex();

    // ── City + Industrial background ──────────────────────────────────────────
    // Buildings — two rows, close enough to be visible
    const bldgDefs = [
      // Row 1 (z -5.5 to -7)
      { x:-5.5, h:4.5, w:0.8, z:-6.5 }, { x:-4.2, h:3.2, w:0.65, z:-5.8 },
      { x:-3.0, h:6.0, w:0.9, z:-7.0 }, { x:-1.8, h:2.8, w:0.6, z:-5.5 },
      { x:-0.6, h:4.2, w:0.7, z:-6.5 }, { x: 0.6, h:3.8, w:0.7, z:-6.0 },
      { x: 1.8, h:5.5, w:0.85,z:-7.0 }, { x: 3.0, h:3.0, w:0.65,z:-5.5 },
      { x: 4.2, h:4.8, w:0.8, z:-6.5 }, { x: 5.5, h:3.5, w:0.75,z:-6.0 },
      // Row 2 (z -8 to -10, taller)
      { x:-6.0, h:7.0, w:1.0, z:-9.5 }, { x:-4.5, h:5.0, w:0.8, z:-8.5 },
      { x:-2.8, h:8.2, w:1.1, z:-10  }, { x:-1.2, h:4.5, w:0.75,z:-8.5 },
      { x: 0.0, h:3.5, w:0.7, z:-8.0 }, { x: 1.2, h:6.5, w:0.9, z:-9.5 },
      { x: 2.8, h:4.2, w:0.8, z:-8.5 }, { x: 4.5, h:7.5, w:1.0, z:-10  },
      { x: 6.0, h:3.8, w:0.9, z:-9.0 },
    ];
    for (const b of bldgDefs) {
      const geo = new THREE.BoxGeometry(b.w, b.h, 0.5);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x050f1e, emissive: 0x071525, emissiveIntensity: 0.5,
        roughness: 0.6, metalness: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h / 2 - 2.8, b.z);
      scene.add(mesh);
      const edges = new THREE.EdgesGeometry(geo);
      const eLine = new THREE.LineSegments(edges,
        new THREE.LineBasicMaterial({ color: 0x1565a0, transparent: true, opacity: 0.85 }));
      eLine.position.copy(mesh.position); scene.add(eLine);
      const rL = new THREE.PointLight(0x1060a0, 0.5, 3.5);
      rL.position.set(b.x, b.h - 2.2, b.z + 0.4); scene.add(rL);
    }

    // Industrial towers (tall thin cylinders — cooling towers / silos)
    const towerDefs = [
      { x:-7.0, h:9.0, r:0.35, z:-8 }, { x:-5.8, h:7.0, r:0.28, z:-7 },
      { x: 5.8, h:8.5, r:0.32, z:-8 }, { x: 7.0, h:6.5, r:0.30, z:-7 },
      { x:-8.0, h:5.0, r:0.22, z:-6 }, { x: 8.0, h:5.5, r:0.25, z:-6 },
    ];
    for (const tw of towerDefs) {
      const geo = new THREE.CylinderGeometry(tw.r * 0.85, tw.r, tw.h, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x06101e, emissive: 0x081828, emissiveIntensity: 0.4,
        roughness: 0.5, metalness: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(tw.x, tw.h / 2 - 3.0, tw.z);
      scene.add(mesh);
      // Tower rim edge
      const rimGeo = new THREE.TorusGeometry(tw.r, 0.018, 6, 20);
      const rimMat = new THREE.MeshBasicMaterial({ color: 0x1565a0, transparent: true, opacity: 0.8 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(tw.x, tw.h - 3.0, tw.z);
      scene.add(rim);
    }

    // Horizontal pipe structures
    const pipeDefs = [
      { x:-4.0, y: 0.2, z:-5.2, len:2.5, axis:'x' },
      { x: 3.5, y: 0.3, z:-5.0, len:2.0, axis:'x' },
      { x:-5.0, y: 0.8, z:-7.5, len:3.0, axis:'x' },
      { x: 4.0, y: 0.6, z:-7.0, len:3.0, axis:'x' },
    ];
    for (const p of pipeDefs) {
      const geo = new THREE.CylinderGeometry(0.06, 0.06, p.len, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x061220, emissive: 0x0a2535, emissiveIntensity: 0.5,
        roughness: 0.45, metalness: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, p.z);
      if (p.axis === 'x') mesh.rotation.z = Math.PI / 2;
      scene.add(mesh);
    }

    // Atmosphere haze
    const hazeGeo = new THREE.PlaneGeometry(30, 8);
    const hazeMat = new THREE.MeshBasicMaterial({ color: 0x0c2540, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.position.set(0, 0.5, -8); scene.add(haze);

    // Ground glow plane
    const groundGlowGeo = new THREE.PlaneGeometry(20, 20);
    const groundGlowMat = new THREE.MeshBasicMaterial({ color: 0x061830, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const groundGlow = new THREE.Mesh(groundGlowGeo, groundGlowMat);
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = -1.0;
    scene.add(groundGlow);

    // ── Platform — industrial gear design ─────────────────────────────────────
    const platform = new THREE.Group();
    platformRef.current = platform;
    scene.add(platform);

    // Main disc body — thick, industrial
    const discGeo = new THREE.CylinderGeometry(PLAT_R, PLAT_R * 0.92, 0.22, 80);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x06101e, emissive: 0x091828, emissiveIntensity: 0.4,
      roughness: 0.5, metalness: 0.65,
    });
    platform.add(new THREE.Mesh(discGeo, discMat));

    // Gear teeth around the outer edge — THE signature element
    const toothCount = 40;
    for (let i = 0; i < toothCount; i++) {
      const a = (2 * Math.PI * i) / toothCount;
      const geo = new THREE.BoxGeometry(0.062, 0.22, 0.095);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x081828, emissive: 0x0d2a3e, emissiveIntensity: 0.45,
        roughness: 0.4, metalness: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        Math.sin(a) * (PLAT_R + 0.048),
        0.0,
        Math.cos(a) * (PLAT_R + 0.048)
      );
      mesh.rotation.y = a;
      platform.add(mesh);
    }

    // Outer edge ring glow (on top surface, thin)
    const makeRing = (r: number, tube: number, col: number, op: number) => {
      const g = new THREE.TorusGeometry(r, tube, 6, 96);
      const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 0.115;
      platform.add(mesh);
      return mesh;
    };
    const outerRing = makeRing(PLAT_R, 0.024, C_EDGE, 0.85);
    makeRing(PLAT_R * 0.68, 0.014, C_WATER, 0.30);
    makeRing(PLAT_R * 0.38, 0.010, C_WATER, 0.20);

    // Radial lines on surface
    for (let i = 0; i < 10; i++) {
      const a = (2 * Math.PI * i) / 10;
      const pts = [
        new THREE.Vector3(0, 0.118, 0),
        new THREE.Vector3(Math.sin(a) * PLAT_R, 0.118, Math.cos(a) * PLAT_R),
      ];
      platform.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x0c2a44, transparent: true, opacity: 0.30 })
      ));
    }

    // Machinery boxes on platform surface (pump stations)
    const machDefs = [
      { a: Math.PI * 0.3,  r: 0.85, w: 0.18, h: 0.12, d: 0.14 },
      { a: Math.PI * 0.9,  r: 0.80, w: 0.16, h: 0.10, d: 0.12 },
      { a: Math.PI * 1.5,  r: 0.88, w: 0.18, h: 0.12, d: 0.14 },
      { a: Math.PI * 2.1,  r: 0.78, w: 0.14, h: 0.10, d: 0.12 },
    ];
    for (const m of machDefs) {
      const geo = new THREE.BoxGeometry(m.w, m.h, m.d);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x061520, emissive: 0x0d2535, emissiveIntensity: 0.5,
        roughness: 0.45, metalness: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        Math.sin(m.a) * m.r, 0.17, Math.cos(m.a) * m.r
      );
      platform.add(mesh);
      // Small indicator light on each
      const iGeo = new THREE.SphereGeometry(0.025, 6, 6);
      const iMat = new THREE.MeshBasicMaterial({ color: C_WATER });
      const ind = new THREE.Mesh(iGeo, iMat);
      ind.position.set(Math.sin(m.a) * m.r, 0.245, Math.cos(m.a) * m.r);
      platform.add(ind);
    }

    // Center hub
    platform.add((() => {
      const g = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 24);
      const m = new THREE.MeshStandardMaterial({ color: 0x04101e, emissive: C_WATER, emissiveIntensity: 0.8 });
      return new THREE.Mesh(g, m);
    })());
    const hubLight = new THREE.PointLight(C_WATER, 0.4, 1.8);
    hubLight.position.y = 0.28; platform.add(hubLight);

    // Active tank floor spotlight (moves to active tank)
    const activePlate = new THREE.PointLight(C_WATER, 0.0, 2.2);
    activePlate.position.y = 0.05; platform.add(activePlate);
    activePlateLightRef.current = activePlate;

    // Connecting pipes (thin, on platform surface)
    for (let i = 0; i < N_SLOTS; i++) {
      const a = baseAngles.current[i];
      const len = ORBIT_R - TANK_R * 1.2;
      const geo = new THREE.CylinderGeometry(0.012, 0.012, len, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x081a28, emissive: 0x0c2838, emissiveIntensity: 0.5,
        roughness: 0.45, metalness: 0.65,
      });
      const pipe = new THREE.Mesh(geo, mat);
      pipe.position.set(Math.sin(a) * (ORBIT_R / 2 - 0.06), 0.1, Math.cos(a) * (ORBIT_R / 2 - 0.06));
      pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
      platform.add(pipe);
    }

    // ── Tanks ─────────────────────────────────────────────────────────────────
    tankGrpsRef.current = []; waterMshRef.current = []; surfMshRef.current = [];
    rippleRef.current = []; glowSprRef.current = []; ptLightRef.current = [];

    for (let i = 0; i < N_SLOTS; i++) {
      const a = baseAngles.current[i];
      const tx = Math.sin(a) * ORBIT_R, tz = Math.cos(a) * ORBIT_R;
      const isReal = i < tanks.length;
      const level = isReal ? (tanks[i].telemetry?.waterLevel ?? 0.65) : GHOST_LVL[i % GHOST_LVL.length];

      const g = new THREE.Group();
      g.position.set(tx, 0.12, tz);

      // Pedestal
      const pedGeo = new THREE.CylinderGeometry(TANK_R * 0.65, TANK_R * 0.80, 0.16, 20);
      g.add(new THREE.Mesh(pedGeo, new THREE.MeshStandardMaterial({
        color: 0x040e1c, emissive: isReal ? C_WATER : 0x091828,
        emissiveIntensity: isReal ? 0.35 : 0.08, roughness: 0.4, metalness: 0.75,
      })));
      const pedRingGeo = new THREE.TorusGeometry(TANK_R * 0.78, 0.012, 6, 28);
      const pedRing = new THREE.Mesh(pedRingGeo, new THREE.MeshBasicMaterial({
        color: isReal ? C_WATER : 0x0d2838, transparent: true, opacity: isReal ? 0.80 : 0.15,
      }));
      pedRing.rotation.x = Math.PI / 2;
      pedRing.position.y = -TANK_H / 2 - 0.02;
      g.add(pedRing);

      // Outer glass cylinder — more opaque, clearly visible
      g.add(new THREE.Mesh(
        new THREE.CylinderGeometry(TANK_R, TANK_R, TANK_H, SEG, 1, true),
        new THREE.MeshPhysicalMaterial({
          color: isReal ? 0xaaddf5 : 0x163248,
          transparent: true, opacity: isReal ? 0.32 : 0.05,
          roughness: 0.06, metalness: 0.0, side: THREE.DoubleSide,
          emissive: isReal ? 0x1a5878 : 0x000000, emissiveIntensity: isReal ? 0.30 : 0,
          depthWrite: false,
        })
      ));

      // Water fill
      const waterH = Math.max(0.06, TANK_H * level);
      const waterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(TANK_R - 0.028, TANK_R - 0.028, waterH, SEG),
        new THREE.MeshStandardMaterial({
          color: isReal ? C_WATER : 0x051d2c, emissive: isReal ? C_WATER : 0x040f18,
          emissiveIntensity: isReal ? 1.50 : 0.15,
          transparent: true, opacity: isReal ? 0.88 : 0.12,
          roughness: 0.0, depthWrite: false,
        })
      );
      waterMesh.position.y = -TANK_H / 2 + waterH / 2;
      waterMesh.renderOrder = 1;
      g.add(waterMesh); waterMshRef.current.push(waterMesh);

      // Water surface
      const surfMesh = new THREE.Mesh(
        new THREE.CircleGeometry(TANK_R - 0.028, SEG),
        new THREE.MeshStandardMaterial({
          color: isReal ? 0x67e8f9 : 0x0a2e3e,
          emissive: isReal ? C_WATER : 0x000000, emissiveIntensity: isReal ? 0.9 : 0,
          transparent: true, opacity: isReal ? 0.95 : 0.08, depthWrite: false,
        })
      );
      surfMesh.rotation.x = -Math.PI / 2;
      surfMesh.position.y = -TANK_H / 2 + waterH + 0.002;
      surfMesh.renderOrder = 2;
      g.add(surfMesh); surfMshRef.current.push(surfMesh);

      // Water ripple rings (3 per tank, staggered — key reference feature)
      const ripples: THREE.Mesh[] = [];
      if (isReal) {
        for (let r = 0; r < 3; r++) {
          const ripGeo = new THREE.TorusGeometry(TANK_R - 0.028, 0.007, 4, SEG);
          const ripMat = new THREE.MeshBasicMaterial({
            color: C_EDGE, transparent: true, opacity: 0, depthWrite: false,
          });
          const ripMesh = new THREE.Mesh(ripGeo, ripMat);
          ripMesh.rotation.x = Math.PI / 2;
          ripMesh.position.y = -TANK_H / 2 + waterH + 0.003;
          ripMesh.renderOrder = 3;
          g.add(ripMesh); ripples.push(ripMesh);
        }
      }
      rippleRef.current.push(ripples);

      // Top rim — bright, signature element
      const topRim = new THREE.Mesh(
        new THREE.TorusGeometry(TANK_R, 0.020, 6, SEG),
        new THREE.MeshBasicMaterial({ color: isReal ? C_EDGE : 0x0a2c40, transparent: true, opacity: isReal ? 1.0 : 0.15 })
      );
      topRim.rotation.x = Math.PI / 2; topRim.position.y = TANK_H / 2;
      g.add(topRim);

      // Bottom rim
      const botRim = new THREE.Mesh(
        new THREE.TorusGeometry(TANK_R, 0.013, 6, SEG),
        new THREE.MeshBasicMaterial({ color: isReal ? C_WATER : 0x091c28, transparent: true, opacity: isReal ? 0.80 : 0.12 })
      );
      botRim.rotation.x = Math.PI / 2; botRim.position.y = -TANK_H / 2;
      g.add(botRim);

      // Glow sprite — large soft halo (additive)
      const glowMat = new THREE.SpriteMaterial({
        map: glowTex, blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false, opacity: isReal ? 0.70 : 0.06,
      });
      const glowSpr = new THREE.Sprite(glowMat);
      glowSpr.scale.set(isReal ? 1.8 : 0.4, isReal ? 2.4 : 0.6, 1.0);
      glowSpr.position.y = 0.12; glowSpr.renderOrder = 0;
      g.add(glowSpr); glowSprRef.current.push(glowSpr);

      // Per-tank point light
      const ptL = new THREE.PointLight(C_WATER, isReal ? 0.5 : 0.05, 2.6);
      ptL.position.y = 0.15; g.add(ptL); ptLightRef.current.push(ptL);

      platform.add(g); tankGrpsRef.current.push(g);
    }

    // Particles
    const pPos = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      const r = 1.2 + Math.random() * 4.2, t = Math.random() * Math.PI * 2;
      pPos[i*3] = Math.cos(t)*r; pPos[i*3+1] = -0.5+Math.random()*4; pPos[i*3+2] = Math.sin(t)*r;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: C_WATER, size: 0.014, transparent: true, opacity: 0.20 })));

    // ── Animation loop ────────────────────────────────────────────────────────
    let t = 0, lblTick = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.016; lblTick++;

      if (!dragging.current && Math.abs(velocity.current) > 0.00015) {
        velocity.current *= 0.934; rotY.current += velocity.current;
      }
      platform.rotation.y = rotY.current;

      const newActive = getActive();
      if (newActive !== activeIdxRef.current) {
        activeIdxRef.current = newActive; setActiveIdx(newActive); onActiveTankChange(newActive);
      }

      // Move floor spotlight to active tank position
      if (activePlateLightRef.current) {
        const aA = baseAngles.current[activeIdxRef.current];
        const tx = Math.sin(aA) * ORBIT_R, tz = Math.cos(aA) * ORBIT_R;
        activePlateLightRef.current.position.x += (tx - activePlateLightRef.current.position.x) * 0.08;
        activePlateLightRef.current.position.z += (tz - activePlateLightRef.current.position.z) * 0.08;
        activePlateLightRef.current.intensity += (2.5 - activePlateLightRef.current.intensity) * 0.06;
      }

      for (let i = 0; i < N_SLOTS; i++) {
        const isActive = i === activeIdxRef.current, isReal = i < tanks.length;
        const tg = tankGrpsRef.current[i], lp = ptLightRef.current[i];
        const wm = waterMshRef.current[i], sm = surfMshRef.current[i];
        const gs = glowSprRef.current[i], rps = rippleRef.current[i];

        // Scale & elevate
        const tSc = isActive ? (isReal ? 1.28 : 0.9) : (isReal ? 0.72 : 0.55);
        const tY  = isActive ? 0.26 : 0.12;
        tg.scale.lerp(new THREE.Vector3(tSc, isActive ? 1.22 : tSc, tSc), 0.065);
        tg.position.y += (tY - tg.position.y) * 0.065;

        // Light
        lp.intensity += ((isActive ? (isReal ? 2.8 : 0.28) : (isReal ? 0.38 : 0.04)) - lp.intensity) * 0.09;

        // Glow sprite
        if (gs) {
          const tGW = isActive ? (isReal ? 3.8 : 0.9) : (isReal ? 1.8 : 0.4);
          const tGH = isActive ? (isReal ? 5.0 : 1.4) : (isReal ? 2.4 : 0.6);
          gs.scale.x += (tGW - gs.scale.x) * 0.07;
          gs.scale.y += (tGH - gs.scale.y) * 0.07;
          const tOp = isActive ? (isReal ? 0.92 : 0.12) : (isReal ? 0.62 : 0.05);
          (gs.material as THREE.SpriteMaterial).opacity += (tOp - (gs.material as THREE.SpriteMaterial).opacity) * 0.07;
        }

        // Water slosh + surface
        if (wm && sm) {
          const lvl = isReal ? (tanks[i]?.telemetry?.waterLevel ?? 0.65) : GHOST_LVL[i % GHOST_LVL.length];
          const wH  = Math.max(0.06, TANK_H * lvl);
          const slosh = Math.sin(t * 1.9 + i * 1.45) * 0.008;
          wm.position.y = -TANK_H / 2 + wH / 2 + slosh;
          sm.position.y = -TANK_H / 2 + wH + slosh + 0.002;
          (sm.material as THREE.MeshStandardMaterial).emissiveIntensity =
            isReal ? 0.7 + Math.sin(t * 2.4 + i) * 0.22 : 0;
          // Update ripple ring Y positions to track surface
          rps.forEach(rp => { rp.position.y = -TANK_H / 2 + wH + slosh + 0.004; });
        }

        // Water ripple animation
        if (isReal && rps.length > 0) {
          const intensity = isActive ? 1.0 : 0.45;
          rps.forEach((rp, ri) => {
            const phase = ((t * 0.55 + ri * 0.38) % 1.0);
            rp.scale.setScalar(0.55 + phase * 1.5);
            (rp.material as THREE.MeshBasicMaterial).opacity =
              Math.max(0, 0.50 - phase * 0.52) * intensity;
          });
        }
      }

      // Outer ring pulse
      (outerRing.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(t * 0.75) * 0.18;

      renderer.render(scene, camera);
      gl.endFrameEXP();

      if (lblTick % 6 === 0) {
        const cam = cameraRef.current; if (!cam) return;
        setLabels(tankGrpsRef.current.map((tg, idx) => {
          const wp = new THREE.Vector3(); tg.getWorldPosition(wp);
          const above = wp.clone(); above.y += TANK_H / 2 + 0.28 + (idx === activeIdxRef.current ? 0.14 : 0);
          const below = wp.clone(); below.y -= TANK_H / 2 + 0.18 + (idx === activeIdxRef.current ? 0.12 : 0);
          const pA = project(above, cam), pB = project(below, cam);
          return {
            ax: pA.x, ay: pA.y, bx: pB.x, by: pB.y,
            idx, isReal: idx < tanks.length,
            name: idx < tanks.length ? tanks[idx].tank.tankName : '',
            level: idx < tanks.length ? (tanks[idx].telemetry?.waterLevel ?? 0) : GHOST_LVL[idx % GHOST_LVL.length],
          };
        }));
      }
    };
    animate();
  }, [N_SLOTS, tanks, getActive, onActiveTankChange, project]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rendererRef.current?.dispose();
  }, []);

  const pan = Gesture.Pan().runOnJS(true)
    .onBegin(() => { dragging.current = true; })
    .onUpdate(e => { rotY.current += e.velocityX * 0.00021; velocity.current = e.velocityX * 0.00021; })
    .onEnd(e => { dragging.current = false; velocity.current = e.velocityX * 0.00019; });

  const tap = Gesture.Tap().runOnJS(true)
    .onEnd(() => {
      const now = Date.now();
      if (now - lastTapAt.current < 380) return;
      lastTapAt.current = now;
      if (activeIdxRef.current < tanks.length) onTankTap(activeIdxRef.current);
    });

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
      <View style={[styles.root, { height: sceneH }]}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
        {labels.map(({ ax, ay, bx, by, idx, isReal, name, level }) => {
          if (!isReal) return null;
          const isAct = idx === activeIdx;
          return (
            <React.Fragment key={idx}>
              <View pointerEvents="none" style={[styles.numWrap, { left: ax - (isAct ? 18 : 13), top: ay - (isAct ? 13 : 10) }]}>
                <Text style={[styles.numText, isAct && styles.numAct]}>{String(idx + 1).padStart(2, '0')}</Text>
              </View>
              <View pointerEvents="none" style={[styles.nameWrap, { left: bx - 60, top: by - 10, opacity: isAct ? 1 : 0.60 }]}>
                <Text style={[styles.nameText, isAct && styles.nameAct]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.lvlText, isAct && styles.lvlAct]}>{Math.round(level * 100)}%</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  numWrap: { position: 'absolute', alignItems: 'center' },
  numText: { fontFamily: typography.fontFamily.headingBold, fontSize: 11, color: 'rgba(34,211,238,0.62)', letterSpacing: 2 },
  numAct:  { fontSize: 15, color: colors.cyan },
  nameWrap: { position: 'absolute', width: 120, alignItems: 'center' },
  nameText: { fontFamily: typography.fontFamily.body, fontSize: 10, color: 'rgba(186,230,253,0.65)', letterSpacing: 0.4 },
  nameAct:  { fontFamily: typography.fontFamily.heading, fontSize: 12, color: 'rgba(255,255,255,0.92)' },
  lvlText:  { fontFamily: typography.fontFamily.headingBold, fontSize: 10, color: 'rgba(34,211,238,0.55)' },
  lvlAct:   { fontSize: 13, color: colors.cyan },
});
