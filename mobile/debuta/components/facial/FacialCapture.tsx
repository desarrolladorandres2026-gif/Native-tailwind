/**
 * FacialCapture.tsx
 * Componente de captura facial reutilizable.
 * Props:
 *  onCapture(base64)  → imagen capturada sin prefijo data:...
 *  onSkip?()          → solo en modo registro (botón "saltar")
 *  mode               → 'register' | 'login' (cambia textos)
 * Ruta sugerida: components/facial/FacialCapture.tsx
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Eye, Camera } from 'lucide-react-native';
import { boxShadow } from '../utils/shadow';

interface Props {
  onCapture: (base64: string) => void;
  onSkip?: () => void;
  mode?: 'register' | 'login';
}

export default function FacialCapture({ onCapture, onSkip, mode = 'register' }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing]       = useState(false);
  const [countdown, setCountdown]       = useState<number | null>(null);
  const cameraRef                       = useRef<CameraView>(null);
  const isLogin                         = mode === 'login';

  // ── Cuenta regresiva 3-2-1 ────────────────────────────────────────────────
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { takePicture(); return; }
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const startCountdown = () => {
    if (capturing || countdown !== null) return;
    setCountdown(3);
  };

  const takePicture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.75, base64: true, skipProcessing: true,
      });
      if (!photo?.base64) throw new Error('Sin datos');
      // Resetear estado ANTES de llamar al padre para que pueda reintentar si falla
      setCapturing(false);
      setCountdown(null);
      onCapture(photo.base64);
    } catch (e) {
      Alert.alert('Error', 'No se pudo capturar la foto. Intenta de nuevo.');
      setCapturing(false);
      setCountdown(null);
    }
  };

  if (!permission) return <View style={s.center}><ActivityIndicator color="#FF6B8A" size="large" /></View>;

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Ionicons name="camera-outline" size={60} color="#FF6B8A" />
        <Text style={s.permTitle}>Cámara requerida</Text>
        <Text style={s.permSub}>Necesitamos acceso a la cámara frontal para verificar tu identidad.</Text>
        <TouchableOpacity style={s.btnPrimary} onPress={requestPermission}>
          <Text style={s.btnText}>Permitir acceso</Text>
        </TouchableOpacity>
        {onSkip && (
          <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
            <Text style={s.skipText}>Continuar sin foto facial</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.titleRow}>
          {isLogin ? <Eye size={22} color="#FF6B8A" /> : <Camera size={22} color="#FF6B8A" />}
          <Text style={s.title}>{isLogin ? 'Identificación facial' : 'Captura de rostro'}</Text>
        </View>
        <Text style={s.subtitle}>
          {isLogin ? 'Mira a la cámara para iniciar sesión' : 'Centra tu cara dentro del óvalo y presiona el botón'}
        </Text>
      </View>

      <View style={s.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
        <View style={s.ovalOverlay} pointerEvents="none">
          <View style={s.oval} />
        </View>
        {countdown !== null && countdown > 0 && (
          <View style={s.countdownBadge}>
            <Text style={s.countdownText}>{countdown}</Text>
          </View>
        )}
        {capturing && (
          <View style={s.processingLayer}>
            <ActivityIndicator size="large" color="#FF6B8A" />
            <Text style={s.processingText}>Analizando rostro…</Text>
          </View>
        )}
      </View>

      <View style={s.tips}>
        {['Buena iluminación frontal', 'Sin lentes de sol ni sombrero', 'Mira directo a la cámara'].map(tip => (
          <View key={tip} style={s.tipRow}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={s.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.btnCapture, (capturing || countdown !== null) && s.btnDisabled]}
          onPress={startCountdown}
          disabled={capturing || countdown !== null}
          activeOpacity={0.8}
        >
          <Ionicons name="scan-circle-outline" size={22} color="#fff" />
          <Text style={s.btnText}>
            {capturing ? 'Procesando…' : countdown !== null ? `Capturando en ${countdown}…` : isLogin ? 'Escanear rostro' : 'Capturar foto'}
          </Text>
        </TouchableOpacity>

        {onSkip && (
          <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
            <Text style={s.skipText}>{isLogin ? 'Iniciar sesión sin facial' : 'Registrar sin foto facial'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const OVAL_W = 210;
const OVAL_H = 270;

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0B0F1A', paddingHorizontal: 24, paddingTop: 8 },
  center:         { flex: 1, backgroundColor: '#0B0F1A', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 },
  header:         { marginBottom: 18, alignItems: 'center' },
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title:          { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitle:       { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cameraWrap:     { height: 340, borderRadius: 22, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  ovalOverlay:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  oval:           { width: OVAL_W, height: OVAL_H, borderRadius: OVAL_W / 2, borderWidth: 3, borderColor: '#FF6B8A', borderStyle: 'dashed' },
  countdownBadge: { position: 'absolute', bottom: 16, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,107,138,0.9)', alignItems: 'center', justifyContent: 'center' },
  countdownText:  { color: '#fff', fontSize: 26, fontWeight: '900' },
  processingLayer:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,15,26,0.82)', alignItems: 'center', justifyContent: 'center', gap: 14 },
  processingText: { color: '#fff', fontSize: 15 },
  tips:           { marginTop: 14, gap: 5 },
  tipRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText:        { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  actions:        { marginTop: 20, gap: 10 },
  btnCapture:     { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B8A', borderRadius: 16, paddingVertical: 16, boxShadow: boxShadow('#FF6B8A', 0, 10, 0.4) },
  btnPrimary:     { backgroundColor: '#FF6B8A', borderRadius: 16, paddingVertical: 16, alignItems: 'center', width: '100%' },
  btnDisabled:    { backgroundColor: '#7a3a4a', boxShadow: 'none' },
  btnText:        { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnSkip:        { alignItems: 'center', paddingVertical: 10 },
  skipText:       { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  permTitle:      { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  permSub:        { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});