// register.tsx — Rediseño Premium Onboarding "Debuta"
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated, Dimensions, Image, Keyboard,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../hooks/useAuth';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { authService } from '../components/services/authService';
import StepIndicator from '../components/registration/StepIndicator';
import { getAge } from '../components/utils/age';
import { boxShadow } from '../components/utils/shadow';
import { useTheme } from '../theme/ThemeContext';

const { width: W } = Dimensions.get('window');
// Offset necesario para que el KAV no sobrecompense en Android
const KAV_OFFSET = Platform.OS === 'android' ? 0 : 0;

const INTERESTS_OPTIONS = [
  'Música', 'Baile', 'Cine', 'Viajes', 'Gastronomía', 
  'Deporte', 'Arte', 'Naturaleza', 'Lectura', 'Tecnología',
  'Café', 'Fiestas', 'Gaming', 'Mascotas', 'Fitness'
];

const LOOKING_FOR_OPTIONS = [
  { id: 'amistad', label: 'Amistad', icon: 'people-outline', desc: 'Conocer gente nueva y vibrar alto' },
  { id: 'citas', label: 'Citas', icon: 'heart-outline', desc: 'Ver qué fluye con alguien especial' },
  { id: 'serio', label: 'Relación seria', icon: 'diamond-outline', desc: 'Construir algo estable y real' },
];

const GENRES = [
  { id: 'masculino', label: 'Hombre', icon: 'male' },
  { id: 'femenino', label: 'Mujer', icon: 'female' },
  { id: 'otro', label: 'Otro', icon: 'ellipsis-horizontal' },
];

export default function RegisterScreen() {
  const { colors, isDark } = useTheme();
  const { register, loading, error, clearError } = useAuth();
  const { showAlert } = useCustomAlert();

  // Estados del formulario
  const [step, setStep] = useState(0);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(null);
  const [genero, setGenero] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [biografia, setBiografia] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [intereses, setIntereses] = useState<string[]>([]);
  const [buscando, setBuscando] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Email verification states
  const [verificationCode, setVerificationCode] = useState('');
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRef = useRef<TextInput | null>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidationActive, setIsValidationActive] = useState(false);

  // Animaciones (sin translateX horizontal — causaba el desconfigurado con teclado)
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  // 0: Bienvenida
  // 1: Identidad
  // 2: Verificación de correo (NUEVO)
  // 3: Edad y Género
  // 4: Ciudad y Bio
  // 5: Intereses y Objetivo
  // 6: Foto
  // 7: Seguridad
  // 8: Éxito
  const totalSteps = 9;

  const startResendTimer = (seconds = 60) => {
    setResendTimer(seconds);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) {
          clearInterval(resendIntervalRef.current!);
          resendIntervalRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    // Normalizamos el step visual para el progress indicator (ignora Bienvenida=0 y Éxito=8)
    let visualStep = step - 1;
    if (visualStep < 0) visualStep = 0;
    if (visualStep > 6) visualStep = 6;

    // Animar progreso
    Animated.spring(progressAnim, {
      toValue: visualStep,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();

    // Fade + slide del contenido del paso (vertical, no horizontal)
    slideAnim.setValue(20);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();

    if (step === 8) {
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 30,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }

    // Auto-focus en el campo OTP al entrar al step de verificación
    if (step === 2) {
      const t = setTimeout(() => otpRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Limpiar el intervalo de cuenta regresiva al desmontar
  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  const validateStep = () => {
    setIsValidationActive(true);
    switch (step) {
      case 0: return true;
      case 1: return nombre.trim().length >= 2 && apellido.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
      case 2: return verificationCode.length === 6;
      case 3: {
        if (!fechaNacimiento || !genero) return false;
        const age = getAge(fechaNacimiento.toISOString());
        if (age === null || age < 18) {
          showAlert({
            title: 'Acceso Restringido',
            message: 'Debuta es una comunidad exclusiva para mayores de 18 años.',
            icon: 'shield-outline',
            iconColor: colors.error
          });
          return false;
        }
        return true;
      }
      case 4: return ciudad.trim().length >= 3 && biografia.trim().length >= 10;
      case 5: return intereses.length >= 3 && buscando !== '';
      case 6: return foto !== null;
      case 7: return password.length >= 6 && password === confirmar && telefono.length >= 10 && acceptedTerms;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (validateStep()) {
      Keyboard.dismiss();

      if (step === 1) {
        // Enviar código de verificación al correo antes de avanzar
        setEmailCodeLoading(true);
        try {
          await authService.sendEmailVerificationCode(correo.trim().toLowerCase(), nombre.trim());
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setStep(2);
          setVerificationCode('');
          startResendTimer();
          setIsValidationActive(false);
          clearError();
        } catch (err: any) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showAlert({
            title: 'Error al enviar código',
            message: err.message || 'No se pudo enviar el código. Intenta de nuevo.',
            icon: 'mail-outline',
            iconColor: colors.error,
          });
        } finally {
          setEmailCodeLoading(false);
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStep(s => Math.min(s + 1, totalSteps - 1));
        setIsValidationActive(false);
        clearError();
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.trim().length !== 6) {
      setIsValidationActive(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setEmailCodeLoading(true);
    try {
      await authService.verifyEmailCode(correo.trim().toLowerCase(), verificationCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(3);
      setIsValidationActive(false);
      clearError();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert({
        title: 'Código inválido',
        message: err.message || 'El código ingresado no es correcto o ha expirado.',
        icon: 'close-circle-outline',
        iconColor: colors.error,
      });
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleResendCode = async () => {
    setEmailCodeLoading(true);
    try {
      await authService.sendEmailVerificationCode(correo.trim().toLowerCase(), nombre.trim());
      setVerificationCode('');
      startResendTimer();
      showAlert({
        title: 'Código reenviado',
        message: `Se envió un nuevo código a ${correo}`,
        icon: 'mail-outline',
        iconColor: colors.primary,
      });
    } catch (err: any) {
      showAlert({
        title: 'Error',
        message: err.message || 'No se pudo reenviar el código.',
        icon: 'alert-circle-outline',
        iconColor: colors.error,
      });
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0) router.back();
    else if (step === 8) return; // En éxito no se vuelve atrás
    else {
      if (step === 2) {
        // Limpiar estado de verificación al volver al paso de identidad
        setVerificationCode('');
        if (resendIntervalRef.current) {
          clearInterval(resendIntervalRef.current);
          resendIntervalRef.current = null;
        }
        setResendTimer(0);
      }
      setStep(s => s - 1);
      setIsValidationActive(false);
      clearError();
    }
  };

  const toggleInteres = (item: string) => {
    Haptics.selectionAsync();
    if (intereses.includes(item)) setIntereses(intereses.filter(i => i !== item));
    else setIntereses([...intereses, item]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4], // Más elegante para fotos de perfil
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
      if (result.assets[0].base64) {
        setFotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleFinalRegister = async () => {
    if (!validateStep()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    clearError();
    
    let finalFirstName = nombre.trim();
    let finalLastName = apellido.trim();
    if (finalFirstName.includes(' ') && !finalLastName) {
      const parts = finalFirstName.split(/\s+/);
      finalFirstName = parts[0];
      finalLastName = parts.slice(1).join(' ');
    }

    await register(
      {
        nombre: finalFirstName,
        apellido: finalLastName,
        correo: correo.trim().toLowerCase(),
        telefono: telefono.replace(/\D/g, ''),
        password,
        genero,
        fechaNacimiento: fechaNacimiento!.toISOString().split('T')[0],
        ciudad: ciudad.trim(),
        bio: biografia.trim(),
        intereses,
        buscando,
        facePhoto: fotoBase64 || undefined,
      },
      async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep(8); // Ir a la pantalla de éxito
      }
    );
  };

  const renderStep = (index: number) => {
    switch (index) {
      case 0: // Bienvenida
        return (
          <View style={s.welcomeContainer}>
            <View style={[s.welcomeIconGlow, { boxShadow: boxShadow(colors.primary, 10, 20, 0.3) }]}>
              <Ionicons name="diamond" size={60} color={colors.primary} />
            </View>
            <Text style={[s.welcomeTitle, { color: colors.text }]}>Bienvenido a Debuta</Text>
            <Text style={[s.welcomeSubtitle, { color: colors.textDim }]}>Donde las conexiones reales comienzan. Un espacio exclusivo diseñado para ti.</Text>
            <View style={{ height: 40 }} />
          </View>
        );

      case 1: // Identidad
        return (
          <>
            <Text style={[s.stepTitle, { color: colors.text }]}>Tu Identidad</Text>
            <Text style={[s.stepSub, { color: colors.textLight }]}>¿Cómo te llamas y cómo te contactamos?</Text>

            <View style={s.row}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={[s.label, { color: colors.textDim }]}>Nombre</Text>
                <View style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && nombre.trim().length < 2 && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                  <TextInput 
                    style={[s.input, { color: colors.text }]} placeholder="Ej. Alex"
                    value={nombre} onChangeText={setNombre}
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>
              <View style={[s.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={[s.label, { color: colors.textDim }]}>Apellido</Text>
                <View style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && apellido.trim().length < 2 && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                  <TextInput 
                    style={[s.input, { color: colors.text }]} placeholder="Ej. Rivera"
                    value={apellido} onChangeText={setApellido}
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Correo electrónico</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textLight} />
                <TextInput 
                  style={[s.input, { color: colors.text }]} placeholder="alex@ejemplo.com"
                  value={correo} onChangeText={setCorreo}
                  keyboardType="email-address" autoCapitalize="none"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            </View>
          </>
        );

      case 2: // Verificación de correo
        return (
          <>
            <Text style={[s.stepTitle, { color: colors.text }]}>Verifica tu correo</Text>
            <Text style={[s.stepSub, { color: colors.textLight }]}>
              Enviamos un código de 6 dígitos a{'\n'}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{correo}</Text>
            </Text>

            {/* OTP boxes */}
            <View style={{ alignItems: 'center', marginVertical: 30 }}>
              <View style={{ position: 'relative' }}>
                <View style={s.otpRow}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        s.otpBox,
                        { backgroundColor: colors.inputBg, borderColor: colors.glassBorder },
                        verificationCode.length === i && { borderColor: colors.primary, borderWidth: 2 },
                        i < verificationCode.length && { borderColor: `${colors.primary}80` },
                        isValidationActive && verificationCode.length < 6 && { borderColor: colors.error },
                      ]}
                    >
                      {verificationCode[i] ? (
                        <Text style={[s.otpDigit, { color: colors.text }]}>{verificationCode[i]}</Text>
                      ) : (
                        verificationCode.length === i && (
                          <View style={[s.otpCursor, { backgroundColor: colors.primary }]} />
                        )
                      )}
                    </View>
                  ))}
                </View>
                <TextInput
                  ref={otpRef}
                  value={verificationCode}
                  onChangeText={v => setVerificationCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  caretHidden
                  style={[StyleSheet.absoluteFillObject, { opacity: 0 }]}
                />
              </View>
            </View>

            {/* Reenviar código */}
            <View style={{ alignItems: 'center', gap: 12 }}>
              {resendTimer > 0 ? (
                <Text style={[s.otpResendText, { color: colors.textLight }]}>
                  Puedes reenviar el código en {resendTimer}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendCode} disabled={emailCodeLoading} activeOpacity={0.7}>
                  <Text style={[s.otpResendText, { color: colors.primary, fontWeight: '700' }]}>
                    Reenviar código
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setStep(1);
                  setVerificationCode('');
                  if (resendIntervalRef.current) {
                    clearInterval(resendIntervalRef.current);
                    resendIntervalRef.current = null;
                  }
                  setResendTimer(0);
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.otpResendText, { color: colors.textDim }]}>Cambiar correo electrónico</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 3: // Edad y Género
        return (
          <>
            <Text style={[s.stepTitle, { color: colors.text }]}>Sobre Ti</Text>
            <Text style={[s.stepSub, { color: colors.textLight }]}>Conocer tu edad y género nos ayuda a encontrar a las personas indicadas.</Text>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Fecha de nacimiento</Text>
              <TouchableOpacity 
                style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && !fechaNacimiento && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textLight} />
                <Text style={[s.input, { color: fechaNacimiento ? colors.text : colors.textLight, marginTop: 4 }]}>
                  {fechaNacimiento ? fechaNacimiento.toLocaleDateString() : 'Seleccionar fecha'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textLight} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={fechaNacimiento || new Date(2000, 0, 1)}
                  mode="date" display="spinner" maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setFechaNacimiento(date);
                  }}
                />
              )}
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Género</Text>
              <View style={s.genresRow}>
                {GENRES.map(g => (
                  <TouchableOpacity 
                    key={g.id} 
                    style={[s.genreCard, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, genero === g.id && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
                    onPress={() => { setGenero(g.id); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={g.icon as any} size={26} color={genero === g.id ? colors.primary : colors.textLight} />
                    <Text style={[s.genreText, { color: colors.textLight }, genero === g.id && { color: colors.primary, fontWeight: '700' }]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        );

      case 4: // Ciudad y Bio
        return (
          <>
            <Text style={[s.stepTitle, { color: colors.text }]}>Tu Esencia</Text>
            <Text style={[s.stepSub, { color: colors.textLight }]}>¿De dónde eres y qué te hace único?</Text>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Ciudad</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && ciudad.trim().length < 3 && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                <Ionicons name="location-outline" size={20} color={colors.textLight} />
                <TextInput 
                  style={[s.input, { color: colors.text }]} placeholder="Ej. Madrid, Bogotá, CDMX"
                  value={ciudad} onChangeText={setCiudad}
                  placeholderTextColor={colors.textLight}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Biografía (Breve)</Text>
              <View style={[s.textAreaContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && biografia.trim().length < 10 && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                <TextInput 
                  style={[s.textArea, { color: colors.text }]} placeholder="Cuéntanos un poco sobre ti (mín. 10 caracteres)"
                  value={biografia} onChangeText={setBiografia}
                  multiline numberOfLines={4} textAlignVertical="top"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            </View>
          </>
        );

      case 5: // Intereses y Objetivo
        return (
          <>
            <Text style={[s.stepTitle, { color: colors.text }]}>Conexiones</Text>
            <Text style={[s.stepSub, { color: colors.textLight }]}>¿Qué te apasiona y qué estás buscando aquí?</Text>

            <Text style={[s.label, { color: colors.textDim, marginBottom: 12 }]}>Tus Intereses ({intereses.length}/3)</Text>
            <View style={s.chipsWrap}>
              {INTERESTS_OPTIONS.map(item => (
                <TouchableOpacity 
                  key={item} 
                  style={[s.chip, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, intereses.includes(item) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => toggleInteres(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, { color: colors.textLight }, intereses.includes(item) && { color: '#fff', fontWeight: '700' }]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.label, { color: colors.textDim, marginTop: 25, marginBottom: 12 }]}>¿Qué buscas?</Text>
            <View style={s.optionsCol}>
              {LOOKING_FOR_OPTIONS.map(opt => (
                <TouchableOpacity 
                  key={opt.id} 
                  style={[s.optionCard, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, buscando === opt.id && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                  onPress={() => { setBuscando(opt.id); Haptics.selectionAsync(); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.optionIcon, { backgroundColor: colors.card }, buscando === opt.id && { backgroundColor: colors.primary }]}>
                    <Ionicons name={opt.icon as any} size={24} color={buscando === opt.id ? '#fff' : colors.textLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, { color: colors.text }, buscando === opt.id && { color: colors.primary }]}>{opt.label}</Text>
                    <Text style={[s.optionDesc, { color: colors.textLight }, buscando === opt.id && { color: colors.textDim }]}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      case 6: // Foto
        return (
          <>
            <Text style={[s.stepTitle, { color: colors.text }]}>Primera Impresión</Text>
            <Text style={[s.stepSub, { color: colors.textLight }]}>Sube una foto donde te veas increíble. Las caras visibles tienen un 80% más de éxito.</Text>

            <TouchableOpacity 
              style={[s.photoFrame, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && !foto && { borderColor: colors.error }]} 
              onPress={pickImage} activeOpacity={0.8}
            >
              {foto ? (
                <Image source={{ uri: foto }} style={s.photo} />
              ) : (
                <View style={s.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={48} color={colors.textLight} />
                  <Text style={[s.photoText, { color: colors.textLight }]}>Elegir Foto</Text>
                </View>
              )}
              {foto && (
                <View style={[s.photoCheck, { backgroundColor: colors.primary, boxShadow: boxShadow(colors.primary, 4, 8, 0.5) }]}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </>
        );

      case 7: // Seguridad
        return (
          <>
            <Text style={[s.stepTitle, { color: colors.text }]}>Seguridad</Text>
            <Text style={[s.stepSub, { color: colors.textLight }]}>Protege tu cuenta y confirma nuestros términos.</Text>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Teléfono</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && telefono.length < 10 && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                <Ionicons name="call-outline" size={20} color={colors.textLight} />
                <TextInput 
                  style={[s.input, { color: colors.text }]} placeholder="Tu número móvil"
                  value={telefono} onChangeText={setTelefono}
                  keyboardType="phone-pad" placeholderTextColor={colors.textLight}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Contraseña</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && password.length < 6 && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />
                <TextInput 
                  style={[s.input, { color: colors.text }]} placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!showPassword} value={password} onChangeText={setPassword}
                  placeholderTextColor={colors.textLight}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textDim }]}>Confirmar Contraseña</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }, isValidationActive && (password !== confirmar || !confirmar) && { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.textLight} />
                <TextInput 
                  style={[s.input, { color: colors.text }]} placeholder="Repite la contraseña"
                  secureTextEntry={!showPassword} value={confirmar} onChangeText={setConfirmar}
                  placeholderTextColor={colors.textLight}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={s.termsWrapper} 
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, { borderColor: colors.textLight }, acceptedTerms && { backgroundColor: colors.primary, borderColor: colors.primary }, isValidationActive && !acceptedTerms && { borderColor: colors.error }]}>
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.termsText, { color: colors.textLight }]}>
                  Acepto los <Text style={[s.linkText, { color: colors.text }]} onPress={() => router.push('/terms')}>Términos y Condiciones</Text> y la <Text style={[s.linkText, { color: colors.text }]} onPress={() => router.push('/terms')}>Política de Privacidad</Text>.
                </Text>
              </View>
            </TouchableOpacity>
          </>
        );

      case 8: // Verificación (Éxito)
        return (
          <View style={s.successContainer}>
            <Animated.View style={[s.successIconWrap, { transform: [{ scale: checkAnim }] }]}>
              <LinearGradient colors={[colors.primary, colors.secondary]} style={s.successIconGradient}>
                <Ionicons name="checkmark" size={60} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <Text style={[s.successTitle, { color: colors.text }]}>¡Estás dentro!</Text>
            <Text style={[s.successSub, { color: colors.textDim }]}>Tu perfil premium ha sido creado. Prepárate para descubrir conexiones increíbles.</Text>
          </View>
        );

      default: return null;
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Fondo Premium */}
      <LinearGradient colors={colors.bg} style={StyleSheet.absoluteFillObject} />
      
      {/* Luces Ambientales Discretas */}
      <View style={[s.ambientLight, { top: -150, left: -100, backgroundColor: colors.primary, opacity: isDark ? 0.15 : 0.05 }]} />
      <View style={[s.ambientLight, { bottom: -100, right: -150, backgroundColor: colors.secondary, opacity: isDark ? 0.15 : 0.05 }]} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
        >
          
          {/* Header (No se muestra en Bienvenida ni en Éxito) */}
          {step > 0 && step < 8 && (
            <View style={s.header}>
              <TouchableOpacity onPress={handleBack} style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={s.progressWrap}>
                <StepIndicator
                  currentStep={step - 1}
                  totalSteps={7}
                  progress={progressAnim}
                  activeColor={colors.primary}
                  inactiveColor={colors.glassBorder}
                />
              </View>
              <View style={{ width: 44 }} />
            </View>
          )}

          {/* Error Box */}
          {error && step < 8 && (
            <View style={[s.errorBox, { backgroundColor: `${colors.error}15` }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Solo renderizamos el paso activo — evita el conflicto con el teclado */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.stepScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {renderStep(step)}
            </Animated.View>
          </ScrollView>

          {/* Footer Navigation */}
          <View style={s.footer}>
            {step === 0 ? (
              <TouchableOpacity style={[s.primaryBtn, { boxShadow: boxShadow(colors.primary, 8, 12, 0.3) }]} onPress={handleNext} activeOpacity={0.8}>
                <LinearGradient colors={[colors.primary, colors.secondary]} start={[0,0]} end={[1,0]} style={s.btnGradient}>
                  <Text style={s.btnText}>Comenzar</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            ) : step === 8 ? (
              <TouchableOpacity
                style={[s.primaryBtn, { boxShadow: boxShadow(colors.primary, 8, 12, 0.3) }]}
                onPress={async () => {
                  const rulesAccepted = await AsyncStorage.getItem('debuta_rules_accepted');
                  router.replace(rulesAccepted ? '/(tabs)' : '/rules');
                }}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[colors.primary, colors.secondary]} start={[0,0]} end={[1,0]} style={s.btnGradient}>
                  <Text style={s.btnText}>Ir al Perfil</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.primaryBtn, { boxShadow: boxShadow(colors.primary, 8, 12, 0.3) }, (loading || emailCodeLoading || (step === 7 && !acceptedTerms)) && s.btnDisabled]}
                onPress={step === 7 ? handleFinalRegister : step === 2 ? handleVerifyCode : handleNext}
                disabled={loading || emailCodeLoading || (step === 7 && !acceptedTerms)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(step === 7 || step === 2) ? [colors.primary, colors.secondary] : [colors.card, colors.card]}
                  start={[0,0]} end={[1,0]} style={[s.btnGradient, (step !== 7 && step !== 2) && { borderWidth: 1, borderColor: colors.glassBorder }]}
                >
                  {(loading || emailCodeLoading) ? (
                    <ActivityIndicator color={(step === 7 || step === 2) ? '#fff' : colors.primary} />
                  ) : (
                    <>
                      <Text style={[s.btnText, (step !== 7 && step !== 2) && { color: colors.text }]}>
                        {step === 7 ? 'Finalizar Registro' : step === 2 ? 'Verificar Código' : 'Continuar'}
                      </Text>
                      {(step !== 7 && step !== 2) && <Ionicons name="arrow-forward" size={20} color={colors.text} style={{ marginLeft: 8 }} />}
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {step === 0 && (
              <TouchableOpacity style={s.loginLink} onPress={() => router.push('/login')} activeOpacity={0.6}>
                <Text style={[s.loginText, { color: colors.textLight }]}>¿Ya tienes cuenta? <Text style={[s.loginTextBold, { color: colors.text }]}>Inicia sesión</Text></Text>
              </TouchableOpacity>
            )}
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  ambientLight: {
    position: 'absolute',
    width: 350, height: 350,
    borderRadius: 175,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  progressWrap: { flex: 1, paddingHorizontal: 20 },
  slidesContainer: { flexDirection: 'row', flex: 1 },
  stepScrollContent: { paddingHorizontal: 25, paddingTop: 10, paddingBottom: 40, flexGrow: 1 },
  
  stepTitle: {
    fontSize: 34, fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSub: {
    fontSize: 16,
    lineHeight: 24, marginBottom: 35,
    fontWeight: '400',
  },
  label: {
    fontSize: 13, fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },

  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 22 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, paddingHorizontal: 16, height: 60,
    borderWidth: 1,
  },
  textAreaContainer: {
    borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, height: 120,
    borderWidth: 1,
  },
  input: {
    flex: 1, fontSize: 16,
    marginLeft: 12, fontWeight: '500',
  },
  textArea: {
    flex: 1, fontSize: 16,
    fontWeight: '500',
  },
  
  genresRow: { flexDirection: 'row', gap: 12 },
  genreCard: {
    flex: 1, height: 100,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, gap: 8,
  },
  genreText: { fontSize: 14, fontWeight: '600' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },

  optionsCol: { gap: 14 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18,
    padding: 16, borderWidth: 1, gap: 16,
  },
  optionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  optionDesc: { fontSize: 13, lineHeight: 18 },

  photoFrame: {
    width: W * 0.65, height: W * 0.85,
    alignSelf: 'center', borderRadius: 24,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginTop: 10,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', gap: 12 },
  photoText: { fontSize: 16, fontWeight: '600' },
  photoCheck: {
    position: 'absolute', bottom: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  termsWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingRight: 20 },
  checkbox: { 
    width: 22, height: 22, borderRadius: 6, 
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  termsText: { fontSize: 14, lineHeight: 20 },
  linkText: { fontWeight: '700', textDecorationLine: 'underline' },

  welcomeContainer: { alignItems: 'center', paddingVertical: 20 },
  welcomeIconGlow: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 30,
  },
  welcomeTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  welcomeSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },

  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successIconWrap: { marginBottom: 30 },
  successIconGradient: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  successSub: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 30 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 10, padding: 12, borderRadius: 12,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

  footer: { padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  primaryBtn: { height: 60, borderRadius: 18, overflow: 'hidden' },
  btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.5 },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginText: { fontSize: 15 },
  loginTextBold: { fontWeight: '800' },

  // OTP Verification
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  otpCursor: {
    width: 2,
    height: 26,
    borderRadius: 1,
    opacity: 0.8,
  },
  otpResendText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});