// SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator,
  StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { authService } from '../../components/services/authService';
import { api } from '../../components/services/api';
import { useTheme } from '../../theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

// ─── SupportModal ─────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { key: 'problema_tecnico', label: '🔧 Problema técnico' },
  { key: 'cuenta',           label: '👤 Mi cuenta' },
  { key: 'pagos',            label: '💳 Pagos' },
  { key: 'abuso',            label: '🚨 Acoso o abuso' },
  { key: 'sugerencia',       label: '💡 Sugerencia' },
  { key: 'otro',             label: '📋 Otro' },
];

function SupportModal({
  visible, onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [categoria,   setCategoria]   = useState('');
  const [asunto,      setAsunto]      = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sending,     setSending]     = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [success,     setSuccess]     = useState(false);

  const reset = () => {
    setCategoria(''); setAsunto(''); setDescripcion('');
    setSending(false); setErrorMsg(''); setSuccess(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSend = async () => {
    setErrorMsg('');
    if (!categoria)                    return setErrorMsg('Selecciona una categoría.');
    if (asunto.trim().length < 5)      return setErrorMsg('El asunto necesita al menos 5 caracteres.');
    if (descripcion.trim().length < 10) return setErrorMsg('La descripción necesita al menos 10 caracteres.');

    setSending(true);
    try {
      await api.post('/soporte', {
        categoria,
        asunto:      asunto.trim(),
        descripcion: descripcion.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={sp.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />

          <View style={[sp.sheet, { backgroundColor: colors.card }]}>
            {/* Handle bar */}
            <View style={[sp.handle, { backgroundColor: colors.glassBorder }]} />

            {success ? (
              /* ── Pantalla de éxito ── */
              <View style={sp.successBox}>
                <View style={sp.successIcon}>
                  <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
                </View>
                <Text style={[sp.successTitle, { color: colors.text }]}>¡Mensaje enviado!</Text>
                <Text style={[sp.successSub, { color: colors.textDim }]}>
                  Tu reporte fue recibido por el equipo de soporte. Te responderemos lo antes posible.
                </Text>
                <TouchableOpacity style={[sp.sendBtn, { backgroundColor: colors.primary }]} onPress={handleClose}>
                  <Text style={sp.sendBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Formulario ── */
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[sp.title, { color: colors.text }]}>Contactar Soporte</Text>
                <Text style={[sp.subtitle, { color: colors.textDim }]}>
                  Cuéntanos qué está pasando y te ayudaremos lo antes posible.
                </Text>

                {/* Categoría */}
                <Text style={[sp.label, { color: colors.textDim }]}>CATEGORÍA</Text>
                <View style={sp.chips}>
                  {CATEGORIAS.map(c => (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        sp.chip,
                        { borderColor: colors.glassBorder, backgroundColor: colors.card },
                        categoria === c.key && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
                      ]}
                      onPress={() => setCategoria(c.key)}
                    >
                      <Text style={[
                        sp.chipText,
                        { color: colors.textDim },
                        categoria === c.key && { color: colors.primary, fontWeight: '700' },
                      ]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Asunto */}
                <Text style={[sp.label, { color: colors.textDim, marginTop: 20 }]}>ASUNTO</Text>
                <TextInput
                  style={[sp.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: `${colors.glassBorder}30` }]}
                  value={asunto}
                  onChangeText={setAsunto}
                  placeholder="Describe brevemente el problema…"
                  placeholderTextColor={colors.textDim}
                  maxLength={150}
                />

                {/* Descripción */}
                <Text style={[sp.label, { color: colors.textDim, marginTop: 16 }]}>DESCRIPCIÓN</Text>
                <TextInput
                  style={[sp.input, sp.textarea, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: `${colors.glassBorder}30` }]}
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="Explica con detalle lo que ocurrió…"
                  placeholderTextColor={colors.textDim}
                  multiline
                  numberOfLines={5}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={[sp.charCount, { color: colors.textDim }]}>{descripcion.length}/1000</Text>

                {/* Error */}
                {!!errorMsg && (
                  <View style={sp.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#d9534f" />
                    <Text style={sp.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Botón enviar */}
                <TouchableOpacity
                  style={[sp.sendBtn, { backgroundColor: colors.primary }, sending && { opacity: 0.7 }]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  {sending
                    ? <ActivityIndicator color="#fff" />
                    : (
                      <>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={sp.sendBtnText}>Enviar reporte</Text>
                      </>
                    )
                  }
                </TouchableOpacity>

                <TouchableOpacity style={sp.cancelBtn} onPress={handleClose}>
                  <Text style={[sp.cancelText, { color: colors.textDim }]}>Cancelar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sp = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: 48, maxHeight: '92%',
  },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 14, marginBottom: 20 },
  title:        { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  subtitle:     { fontSize: 14, lineHeight: 20, marginBottom: 22 },
  label:        { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  chipText:     { fontSize: 13, fontWeight: '500' },
  input: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 4,
  },
  textarea:     { height: 130, paddingTop: 14 },
  charCount:    { fontSize: 11, textAlign: 'right', marginBottom: 16, marginTop: 4 },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText:    { color: '#d9534f', fontSize: 13, flex: 1 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 16, marginTop: 4,
    shadowColor: '#FD297B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  sendBtnText:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn:    { alignItems: 'center', paddingVertical: 14 },
  cancelText:   { fontSize: 14, fontWeight: '600' },
  // Success
  successBox:   { alignItems: 'center', paddingVertical: 32 },
  successIcon:  { marginBottom: 8 },
  successTitle: { fontSize: 24, fontWeight: '900', marginTop: 8 },
  successSub:   { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20, marginHorizontal: 16 },
});

// ─── VerifyIdentityModal ──────────────────────────────────────────────────────
function VerifyIdentityModal({
  visible, onClose, onVerified,
}: {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const { colors } = useTheme();
  const { showAlert } = useCustomAlert();
  const [loading, setLoading] = useState(false);

  const handleTakeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return showAlert({ title: 'Permiso denegado', message: 'Se necesita acceso a la cámara para verificar tu identidad.', icon: 'alert-circle' });
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const base64 = result.assets[0].base64;
    if (!base64) return;

    setLoading(true);
    try {
      const res = await api.putLong<{ ok: boolean; is_verified: boolean }>('/facial/update', { 
        image: `data:image/jpeg;base64,${base64}` 
      });
      if (res.ok || res.is_verified) {
        onVerified();
        onClose();
        showAlert({ title: '¡Éxito!', message: 'Tu identidad ha sido verificada correctamente.', icon: 'checkmark-circle' });
      } else {
        throw new Error('No se pudo verificar la identidad.');
      }
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Error al subir la foto.', icon: 'close-circle' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sp.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[sp.sheet, { backgroundColor: colors.card, paddingBottom: 40 }]}>
          <View style={[sp.handle, { backgroundColor: colors.glassBorder }]} />
          
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="shield-checkmark" size={44} color={colors.primary} />
            </View>
            <Text style={[sp.title, { color: colors.text, textAlign: 'center' }]}>Verificar Identidad</Text>
            <Text style={[sp.subtitle, { color: colors.textDim, textAlign: 'center', marginTop: 10 }]}>
              Para tu seguridad y la de la comunidad, necesitamos confirmar que eres tú. Tómate una selfie rápida.
            </Text>
          </View>

          <TouchableOpacity 
            style={[sp.sendBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} 
            onPress={handleTakeSelfie}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={sp.sendBtnText}>Tomar Selfie</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={sp.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={[sp.cancelText, { color: colors.textDim }]}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const { showAlert } = useCustomAlert();
  const { logout } = useAuth();
  
  const {
    settings,
    loading,
    save: updateSettings,
    refetch: fetchSettings,
  } = useSettings();

  const [localSettings,   setLocalSettings]   = useState<any>(null);
  const [saving,          setSaving]          = useState(false);
  const [showSupportModal,setShowSupportModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal]  = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userProfile,     setUserProfile]     = useState<any>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/me');
        setUserProfile(res.usuario);
      } catch (e) {
        console.warn('Error al obtener perfil:', e);
      }
    };
    fetchMe();
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  }, [settings]);

  const handleUpdate = async (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setSaving(true);
    await updateSettings({ [key]: value });
    setSaving(false);
  };

  const handleLogout = () => {
    showAlert({
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir?',
      icon: 'log-out-outline',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            router.replace('/login');
          } 
        }
      ]
    });
  };

  const handleDelete = () => {
    showAlert({
      title: 'Eliminar Cuenta',
      message: 'Esta acción es permanente y borrará todos tus datos. ¿Proceder?',
      icon: 'trash-outline',
      iconColor: colors.error,
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await authService.deleteAccount();
              router.replace('/login');
            } catch (e) {
              console.error('Error al eliminar cuenta:', e);
            }
          } 
        }
      ]
    });
  };

  if (loading && !localSettings) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderSectionHeader = (title: string, icon: any) => (
    <View style={s.sectionHeader}>
      <View style={[s.sectionIcon, { backgroundColor: colors.card }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[s.sectionTitle, { color: colors.textDim }]}>{title}</Text>
    </View>
  );

  const renderOption = (label: string, icon: any, rightElement?: React.ReactNode, onPress?: () => void) => (
    <TouchableOpacity 
      style={[s.optionRow, { borderBottomColor: colors.glassBorder }]} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={s.optionLeft}>
        <Ionicons name={icon} size={22} color={colors.textDim} style={s.optIcon} />
        <Text style={[s.optionText, { color: colors.text }]}>{label}</Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.glassBorder} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg[0] }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[s.header, { borderBottomColor: colors.glassBorder }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Configuración</Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 🚨 Banner de Verificación Obligatorio */}
        {userProfile && !userProfile.is_verified && (
          <TouchableOpacity 
            style={[s.verifyBanner, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}
            onPress={() => setShowVerifyModal(true)}
            activeOpacity={0.8}
          >
            <View style={[s.verifyIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.verifyTitle, { color: colors.text }]}>Verifica tu identidad</Text>
              <Text style={[s.verifySub, { color: colors.textDim }]}>Es un requisito obligatorio para usar Debuta de forma segura.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        <View style={s.section}>
          {renderSectionHeader('Cuenta', 'person-outline')}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {renderOption('Editar Perfil', 'person-circle-outline', null, () => router.push('/profile'))}
            {renderOption(
              'Verificar Identidad', 
              'shield-checkmark-outline', 
              userProfile?.is_verified ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: '#4CAF50', fontSize: 13, fontWeight: '700' }}>Verificado</Text>
                  <Ionicons name="checkmark-done-circle" size={18} color="#4CAF50" />
                </View>
              ) : (
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Pendiente</Text>
              ),
              userProfile?.is_verified ? undefined : () => setShowVerifyModal(true)
            )}
            {renderOption('Visibilidad del Perfil', 'eye-outline', (
              <Switch 
                value={localSettings?.profile_visible ?? true} 
                onValueChange={(v) => handleUpdate('profile_visible', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.profile_visible !== false ? 'white' : '#f4f3f4'}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          {renderSectionHeader('Preferencias de Discovery', 'options-outline')}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {renderOption('Mostrarme a', 'people-outline', (
              <Text style={[s.valueText, { color: colors.primary }]}>
                {localSettings?.show_me === 'M' ? 'Hombres' : localSettings?.show_me === 'F' ? 'Mujeres' : 'Todos'}
              </Text>
            ), () => setShowDiscoveryModal(true))}
            {renderOption('Rango de Edad', 'calendar-outline', (
              <Text style={[s.valueText, { color: colors.primary }]}>{localSettings?.min_age || 18} - {localSettings?.max_age || 40}</Text>
            ), () => setShowDiscoveryModal(true))}
            {renderOption('Distancia Máxima', 'location-outline', (
              <Text style={[s.valueText, { color: colors.primary }]}>{localSettings?.max_distance || 50} km</Text>
            ), () => setShowDiscoveryModal(true))}
            {renderOption('Solo perfiles verificados', 'shield-checkmark-outline', (
              <Switch 
                value={localSettings?.verified_only ?? false} 
                onValueChange={(v) => handleUpdate('verified_only', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.verified_only ? 'white' : '#f4f3f4'}
              />
            ))}
            {renderOption('Solo perfiles con biografía', 'document-text-outline', (
              <Switch 
                value={localSettings?.has_bio_only ?? false} 
                onValueChange={(v) => handleUpdate('has_bio_only', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.has_bio_only ? 'white' : '#f4f3f4'}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          {renderSectionHeader('Notificaciones', 'notifications-outline')}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {renderOption('Nuevos Matches', 'heart-outline', (
              <Switch 
                value={localSettings?.notif_matches ?? true} 
                onValueChange={(v) => handleUpdate('notif_matches', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.notif_matches !== false ? 'white' : '#f4f3f4'}
              />
            ))}
            {renderOption('Mensajes', 'chatbubble-outline', (
              <Switch 
                value={localSettings?.notif_messages ?? true} 
                onValueChange={(v) => handleUpdate('notif_messages', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.notif_messages !== false ? 'white' : '#f4f3f4'}
              />
            ))}
            {renderOption('Recomendaciones', 'star-outline', (
              <Switch 
                value={localSettings?.notif_recomend ?? false} 
                onValueChange={(v) => handleUpdate('notif_recomend', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.notif_recomend ? 'white' : '#f4f3f4'}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          {renderSectionHeader('Privacidad', 'lock-closed-outline')}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {renderOption('Mostrar mi edad', 'calendar-number-outline', (
              <Switch 
                value={localSettings?.show_age ?? true} 
                onValueChange={(v) => handleUpdate('show_age', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.show_age !== false ? 'white' : '#f4f3f4'}
              />
            ))}
            {renderOption('Mostrar mi distancia', 'navigate-outline', (
              <Switch 
                value={localSettings?.show_distance ?? true} 
                onValueChange={(v) => handleUpdate('show_distance', v)}
                trackColor={{ true: colors.primary, false: colors.glassBorder }}
                thumbColor={localSettings?.show_distance !== false ? 'white' : '#f4f3f4'}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          {renderSectionHeader('Legal y Soporte', 'information-circle-outline')}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {renderOption('Términos y Privacidad', 'document-text-outline', null, () => router.push('/terms'))}
            {renderOption(
              'Soporte',
              'help-circle-outline',
              <View style={[s.supportBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[s.supportBadgeText, { color: colors.primary }]}>Contactar</Text>
              </View>,
              () => setShowSupportModal(true)
            )}
          </View>
        </View>

        <View style={s.section}>
          {renderSectionHeader('Apariencia', 'color-palette-outline')}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {renderOption('Modo Claro', themeMode === 'light' ? 'sunny' : 'sunny-outline', (
              themeMode === 'light' && <Ionicons name="checkmark" size={20} color={colors.primary} />
            ), () => setThemeMode('light'))}
            {renderOption('Modo Oscuro', themeMode === 'dark' ? 'moon' : 'moon-outline', (
              themeMode === 'dark' && <Ionicons name="checkmark" size={20} color={colors.primary} />
            ), () => setThemeMode('dark'))}
            {renderOption('Automático (Sistema)', themeMode === 'system' ? 'contrast' : 'contrast-outline', (
              themeMode === 'system' && <Ionicons name="checkmark" size={20} color={colors.primary} />
            ), () => setThemeMode('system'))}
          </View>
        </View>

        <View style={s.section}>
          {renderSectionHeader('Seguridad', 'shield-outline')}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {renderOption('Cambiar Contraseña', 'key-outline', null, () => setShowPasswordModal(true))}
          </View>
        </View>

        <View style={s.section}>
          <TouchableOpacity style={[s.actionBtn, { borderColor: colors.glassBorder }]} onPress={handleLogout}>
            <LinearGradient
              colors={['transparent', 'transparent']}
              style={StyleSheet.absoluteFill}
              borderRadius={20}
            />
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
            <Text style={[s.actionBtnText, { color: colors.primary }]}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.actionBtn, { borderColor: colors.glassBorder, marginTop: 15 }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.textDim} />
            <Text style={[s.actionBtnText, { color: colors.textDim }]}>Eliminar Cuenta</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.versionText, { color: colors.textDim }]}>Debuta v1.0.0 (Beta)</Text>
      </ScrollView>

      {/* Modal de soporte */}
      <SupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* Modal de configuración de discovery */}
      <DiscoverySettingsModal
        visible={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        settings={localSettings}
        onSave={async (newSettings) => {
          setLocalSettings({ ...localSettings, ...newSettings });
          await updateSettings(newSettings);
        }}
      />

      {/* Modal de cambio de contraseña */}
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── DiscoverySettingsModal ───────────────────────────────────────────────────
function DiscoverySettingsModal({ visible, onClose, settings, onSave }: any) {
  const { colors } = useTheme();
  const [showMe, setShowMe] = useState(settings?.show_me || 'ALL');
  const [minAge, setMinAge] = useState(settings?.min_age || 18);
  const [maxAge, setMaxAge] = useState(settings?.max_age || 40);
  const [maxDist, setMaxDist] = useState(settings?.max_distance || 50);

  useEffect(() => {
    if (settings) {
      setShowMe(settings.show_me || 'ALL');
      setMinAge(settings.min_age || 18);
      setMaxAge(settings.max_age || 40);
      setMaxDist(settings.max_distance || 50);
    }
  }, [settings, visible]);

  const handleSave = () => {
    onSave({
      show_me: showMe,
      min_age: minAge,
      max_age: maxAge,
      max_distance: maxDist,
    });
    onClose();
  };

  const adjustValue = (setter: any, current: number, change: number, min: number, max: number) => {
    const newVal = current + change;
    if (newVal >= min && newVal <= max) {
      setter(newVal);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sp.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[sp.sheet, { backgroundColor: colors.card, paddingBottom: 40 }]}>
          <View style={[sp.handle, { backgroundColor: colors.glassBorder }]} />
          
          <Text style={[sp.title, { color: colors.text, marginBottom: 20 }]}>Ajustes de Discovery</Text>

          {/* Mostrarme a */}
          <Text style={[sp.label, { color: colors.textDim }]}>MOSTRARME A</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 25 }}>
            {[
              { val: 'M', label: 'Hombres' },
              { val: 'F', label: 'Mujeres' },
              { val: 'ALL', label: 'Todos' }
            ].map(item => (
              <TouchableOpacity
                key={item.val}
                style={[
                  { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.glassBorder, alignItems: 'center' },
                  showMe === item.val && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }
                ]}
                onPress={() => setShowMe(item.val)}
              >
                <Text style={[{ color: colors.textDim, fontWeight: '600' }, showMe === item.val && { color: colors.primary, fontWeight: '800' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rango de edad */}
          <Text style={[sp.label, { color: colors.textDim }]}>EDAD MÍNIMA ({minAge})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, justifyContent: 'center', gap: 20 }}>
            <TouchableOpacity onPress={() => adjustValue(setMinAge, minAge, -1, 18, maxAge)} style={[s.stepperBtn, { backgroundColor: `${colors.glassBorder}30` }]}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary, minWidth: 40, textAlign: 'center' }}>{minAge}</Text>
            <TouchableOpacity onPress={() => adjustValue(setMinAge, minAge, 1, 18, maxAge)} style={[s.stepperBtn, { backgroundColor: `${colors.glassBorder}30` }]}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[sp.label, { color: colors.textDim }]}>EDAD MÁXIMA ({maxAge})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25, justifyContent: 'center', gap: 20 }}>
            <TouchableOpacity onPress={() => adjustValue(setMaxAge, maxAge, -1, minAge, 100)} style={[s.stepperBtn, { backgroundColor: `${colors.glassBorder}30` }]}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary, minWidth: 40, textAlign: 'center' }}>{maxAge}</Text>
            <TouchableOpacity onPress={() => adjustValue(setMaxAge, maxAge, 1, minAge, 100)} style={[s.stepperBtn, { backgroundColor: `${colors.glassBorder}30` }]}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Distancia máxima */}
          <Text style={[sp.label, { color: colors.textDim }]}>DISTANCIA MÁXIMA ({maxDist} km)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30, justifyContent: 'center', gap: 20 }}>
            <TouchableOpacity onPress={() => adjustValue(setMaxDist, maxDist, -5, 5, 200)} style={[s.stepperBtn, { backgroundColor: `${colors.glassBorder}30` }]}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary, minWidth: 60, textAlign: 'center' }}>{maxDist}</Text>
            <TouchableOpacity onPress={() => adjustValue(setMaxDist, maxDist, 5, 5, 200)} style={[s.stepperBtn, { backgroundColor: `${colors.glassBorder}30` }]}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[sp.sendBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
            <Text style={sp.sendBtnText}>Guardar Cambios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sp.cancelBtn} onPress={onClose}>
            <Text style={[sp.cancelText, { color: colors.textDim }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── ChangePasswordModal ─────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }: any) {
  const { colors } = useTheme();
  const { changePassword } = useSettings();
  const { showAlert } = useCustomAlert();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    setErrorMsg('');
    if (!currentPassword || !newPassword || !confirmPassword) return setErrorMsg('Completa todos los campos.');
    if (newPassword.length < 6) return setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
    if (newPassword !== confirmPassword) return setErrorMsg('Las contraseñas no coinciden.');

    setLoading(true);
    const err = await changePassword(currentPassword, newPassword);
    setLoading(false);
    
    if (err) {
      setErrorMsg(err);
    } else {
      showAlert({ title: 'Éxito', message: 'Contraseña actualizada correctamente.', icon: 'checkmark-circle' });
      handleClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={sp.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
          <View style={[sp.sheet, { backgroundColor: colors.card, paddingBottom: 40 }]}>
            <View style={[sp.handle, { backgroundColor: colors.glassBorder }]} />
            
            <Text style={[sp.title, { color: colors.text, marginBottom: 20 }]}>Cambiar Contraseña</Text>

            <TextInput
              style={[sp.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: `${colors.glassBorder}30`, marginBottom: 15 }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Contraseña actual"
              placeholderTextColor={colors.textDim}
              secureTextEntry
            />

            <TextInput
              style={[sp.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: `${colors.glassBorder}30`, marginBottom: 15 }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contraseña"
              placeholderTextColor={colors.textDim}
              secureTextEntry
            />

            <TextInput
              style={[sp.input, { color: colors.text, borderColor: colors.glassBorder, backgroundColor: `${colors.glassBorder}30`, marginBottom: 15 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar nueva contraseña"
              placeholderTextColor={colors.textDim}
              secureTextEntry
            />

            {!!errorMsg && (
              <View style={sp.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#d9534f" />
                <Text style={sp.errorText}>{errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[sp.sendBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={sp.sendBtnText}>Actualizar Contraseña</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity style={sp.cancelBtn} onPress={handleClose}>
              <Text style={[sp.cancelText, { color: colors.textDim }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  headerTitle:  { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  section:      { marginTop: 28, paddingHorizontal: 20 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingLeft: 5 },
  sectionIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  card:         { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  optionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 18, 
    height: 64, 
    borderBottomWidth: 1,
  },
  optionLeft:   { flexDirection: 'row', alignItems: 'center' },
  optIcon:      { marginRight: 14 },
  optionText:   { fontSize: 16, fontWeight: '700' },
  valueText:    { fontSize: 15, fontWeight: '800', marginRight: 8 },
  supportBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  supportBadgeText: { fontSize: 12, fontWeight: '700' },
  actionBtn:    { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 10 },
  actionBtnText:{ fontSize: 16, fontWeight: '800' },
  versionText:  { textAlign: 'center', marginTop: 30, fontSize: 12, fontWeight: '700' },
  // Verification Banner
  verifyBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  verifyIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  verifySub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});