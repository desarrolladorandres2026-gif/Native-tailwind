// login.tsx - Rediseño Premium Debuta
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated, Dimensions, Keyboard, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../hooks/useAuth';
import FloatingHearts from '../components/ui/FloatingHearts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';

const { width: W } = Dimensions.get('window');

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { login, loginWithGoogle, loginWithFacebook, loading, error, clearError } = useAuth();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
    ]).start();

    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!correo || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await login({ correo: correo.trim().toLowerCase(), password }, async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const rulesAccepted = await AsyncStorage.getItem('debuta_rules_accepted');
      if (rulesAccepted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/rules');
      }
    });
  };

  const handleSocialLogin = async (type: 'google' | 'facebook') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const method = type === 'google' ? loginWithGoogle : loginWithFacebook;
    await method(async (_user) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const rulesAccepted = await AsyncStorage.getItem('debuta_rules_accepted');
      if (rulesAccepted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/rules');
      }
    });
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Fondo Premium */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={colors.bg} style={StyleSheet.absoluteFillObject} />
        <View style={[s.bgBlob, { top: -100, right: -50, backgroundColor: colors.primary, opacity: isDark ? 0.2 : 0.6 }]} />
        <View style={[s.bgBlob, { bottom: -50, left: -50, backgroundColor: colors.secondary, opacity: isDark ? 0.15 : 0.4 }]} />
        <FloatingHearts />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
              
              <View style={s.header}>
                <View style={s.logoContainer}>
                  <View style={[s.logoGlass, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Ionicons name="heart" size={42} color={colors.primary} />
                  </View>
                </View>
                <Text style={[s.title, { color: '#FFFFFF' }]}>Debuta</Text>
                <Text style={[s.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>Tu próxima conexión te espera</Text>
              </View>

              <View style={[s.glassCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                {error && (
                  <View style={[s.errorBadge, { backgroundColor: `${colors.error}15` }]}>
                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                    <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>
                  </View>
                )}

                <View style={s.inputGroup}>
                  <Text style={[s.label, { color: colors.primary }]}>Correo Electrónico</Text>
                  <View style={[s.inputWrapper, { backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]}>
                    <Ionicons name="mail-outline" size={20} color={colors.primary} style={s.inputIcon} />
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      placeholder="ejemplo@correo.com"
                      placeholderTextColor={colors.textLight}
                      value={correo}
                      onChangeText={(t) => { setCorreo(t); clearError(); }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={[s.label, { color: colors.primary }]}>Contraseña</Text>
                  <View style={[s.inputWrapper, { backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={s.inputIcon} />
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textLight}
                      value={password}
                      onChangeText={(t) => { setPassword(t); clearError(); }}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={s.forgotBtn} onPress={() => router.push('/forgot-password')}>
                  <Text style={[s.forgotText, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[s.loginBtn, { shadowColor: colors.primary }, loading && s.btnDisabled]} 
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.btnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Text style={s.loginBtnText}>Iniciar Sesión</Text>
                        <Ionicons name="arrow-forward" size={22} color="white" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={s.divider}>
                  <View style={[s.line, { backgroundColor: colors.glassBorder }]} />
                  <Text style={[s.dividerText, { color: colors.textLight }]}>O entra con</Text>
                  <View style={[s.line, { backgroundColor: colors.glassBorder }]} />
                </View>

                <View style={s.socialRow}>
                  <TouchableOpacity style={[s.socialBtn, { backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]} onPress={() => handleSocialLogin('google')}>
                    <Ionicons name="logo-google" size={26} color="#DB4437" />
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.socialBtn, { backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]} onPress={() => handleSocialLogin('facebook')}>
                    <Ionicons name="logo-facebook" size={26} color="#4267B2" />
                  </TouchableOpacity>
                </View>
              </View>

              {!isKeyboardVisible && (
                <View style={s.footer}>
                  <Text style={[s.footerText, { color: '#FFFFFF' }]}>¿No tienes cuenta? </Text>
                  <TouchableOpacity onPress={() => { clearError(); router.push('/register'); }}>
                    <Text style={[s.registerText, { color: '#FFFFFF' }]}>Regístrate gratis</Text>
                  </TouchableOpacity>
                </View>
              )}

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bgBlob: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  scroll: { paddingHorizontal: 25, flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 30 },
  logoContainer: { marginBottom: 15 },
  logoGlass: { width: 80, height: 80, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 16, marginTop: 5, fontWeight: '500' },
  glassCard: { borderRadius: 30, padding: 25, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  errorBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 15, marginBottom: 20, gap: 8 },
  errorText: { fontSize: 14, fontWeight: '700', flex: 1 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginLeft: 5 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    height: 60, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 1 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 14, fontWeight: '700' },
  loginBtn: { height: 64, borderRadius: 22, overflow: 'hidden', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loginBtnText: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.7 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 15, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  socialRow: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  socialBtn: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 35 },
  footerText: { fontSize: 15, fontWeight: '500' },
  registerText: { fontSize: 15, fontWeight: '900', textDecorationLine: 'underline' },
});