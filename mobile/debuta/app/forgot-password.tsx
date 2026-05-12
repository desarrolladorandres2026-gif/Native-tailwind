// forgot-password.tsx — Debuta: Pantalla "¿Olvidaste tu contraseña?"

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
  StyleSheet, Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FloatingHearts from '../components/ui/FloatingHearts';
import { api } from '../components/services/api';

const { width: W } = Dimensions.get('window');

const C = {
  background:   '#FFFFFF',
  gradientMain: ['#FF5864', '#FF655B', '#FD297B'] as const,
  primary:      '#FD297B',
  secondary:    '#FF655B',
  accent:       '#FF5864',
  text:         '#000000',
  textSoft:     '#424242',
  textLight:    'rgba(66,66,66,0.5)',
  glass:        '#FFFFFF',
  glassBorder:  '#EEEEEE',
  inputBg:      '#F5F5F5',
  inputBorder:  '#EEEEEE',
  shadow:       'rgba(253,41,123,0.3)',
  error:        '#E05070',
  errorBg:      'rgba(224,80,112,0.10)',
  success:      '#22C55E',
  successBg:    'rgba(34,197,94,0.10)',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [correo,   setCorreo]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [enviado,  setEnviado]  = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleEnviar = async () => {
    setError(null);
    const correoTrim = correo.trim().toLowerCase();

    if (!correoTrim)
      return setError('Ingresa tu correo electrónico');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoTrim))
      return setError('El correo no tiene un formato válido');

    setLoading(true);
    try {
      await api.post('/password/forgot', { correo: correoTrim });
      setEnviado(true);
      // Navegar a la pantalla de verificación de código
      router.push({
        pathname: '/verify-code',
        params:   { correo: correoTrim },
      });
    } catch (e: any) {
      setError(e.message || 'No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      {/* Fondo */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={C.gradientMain} start={[0, 0]} end={[1, 1]} style={StyleSheet.absoluteFillObject} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.92)' }]} />
        <FloatingHearts />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
          <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Botón volver */}
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={C.textSoft} />
            </TouchableOpacity>

            {/* Header */}
            <View style={s.header}>
              <View style={s.iconOuter}>
                <LinearGradient colors={[C.primary, C.secondary]} start={[0,0]} end={[1,1]} style={StyleSheet.absoluteFillObject} />
                <View style={s.iconInner}>
                  <Ionicons name="lock-open-outline" size={32} color={C.primary} />
                </View>
              </View>
              <Text style={s.logo}>Debuta</Text>
              <Text style={s.heading}>¿Olvidaste tu contraseña?</Text>
              <Text style={s.subheading}>
                Escribe tu correo y te enviaremos{'\n'}un código para recuperarla
              </Text>
            </View>

            {/* Tarjeta */}
            <View style={s.card}>

              {/* Error */}
              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={C.error} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Input correo */}
              <View>
                <Text style={s.label}>Correo electrónico</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="mail-outline" size={19} color={C.secondary} />
                  <TextInput
                    style={s.input}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={C.textLight}
                    value={correo}
                    onChangeText={v => { setError(null); setCorreo(v); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Botón enviar */}
              <TouchableOpacity
                style={s.btnPrimary}
                onPress={handleEnviar}
                activeOpacity={0.85}
                disabled={loading}
              >
                <LinearGradient
                  colors={[C.accent, C.secondary]}
                  start={[0, 0]}
                  end={[1, 0]}
                  style={s.btnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={s.btnText}>Enviar código</Text>
                      <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Volver al login */}
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => router.replace('/login')}>
                <Text style={s.switchText}>
                  ¿Recuerdas tu contraseña?{' '}
                  <Text style={s.switchLink}>Inicia sesión</Text>
                </Text>
              </TouchableOpacity>

            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },

  container: { flex: 1, justifyContent: 'center' },

  backBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  header: {
    alignItems: 'center',
    paddingBottom: 24,
    gap: 6,
    paddingTop: 60,
  },
  iconOuter: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 4,
  },
  iconInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.glass,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.glassBorder,
  },
  logo:       { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: 1 },
  heading:    { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 4, textAlign: 'center' },
  subheading: { fontSize: 14, color: C.textSoft, marginTop: 4, textAlign: 'center', lineHeight: 20 },

  card: {
    marginHorizontal: 20,
    backgroundColor: C.glass,
    borderRadius: 28,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: C.glassBorder,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: C.errorBg,
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(224,80,112,0.25)',
  },
  errorText: { color: C.error, fontSize: 13, flex: 1 },

  label:    { color: C.textSoft, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.inputBg,
    borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, color: C.text, fontSize: 15 },

  btnPrimary: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
  },
  btnText:    { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },

  switchText: { color: C.textSoft, fontSize: 14 },
  switchLink: { color: C.accent, fontWeight: '800' },
});
