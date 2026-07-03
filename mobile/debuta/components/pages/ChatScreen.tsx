// ChatScreen.tsx — Rediseño premium con sugerencia de primera cita
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
  Keyboard, Pressable, Animated,
  Alert, Modal, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useChat, DateSuggestion } from '../../hooks/useChat';
import { usePresence } from '../../hooks/usePresence';
import { useCall } from '../../context/CallContext';
import { useSocket } from '../../context/SocketContext';
import { incrementMessagesSent, updateBestStreak } from '../profile/BadgesSection';
import { lastSeenText } from '../utils/age';
import { boxShadow } from '../utils/shadow';
import { useTheme } from '../../theme/ThemeContext';
import { api } from '../services/api';
import ReportModal from '../report/ReportModal';
import { Sparkles, UtensilsCrossed, Flame } from 'lucide-react-native';

const EMOJIS = ['😀','😂','🥰','😎','😭','👍','❤️','🔥','✨','💯','🎉','💬'];

// Opciones para editar la fecha/hora de la cita
const DIAS_CITA  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const HORAS_CITA = ['12:00 PM','1:00 PM','3:00 PM','5:00 PM','6:00 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM'];

// ── Tarjeta de Sugerencia de Primera Cita ──────────────────────────────────────
function DateSuggestionCard({
  suggestion, myId, onAccept, onNewPlace, onEditDate, dateLoading, colors, isDark,
}: {
  suggestion: DateSuggestion;
  myId: string | null;
  onAccept: () => void;
  onNewPlace: () => void;
  onEditDate: (fecha: string) => Promise<boolean>;
  dateLoading: boolean;
  colors: any;
  isDark: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showEditDate, setShowEditDate] = useState(false);
  const [editDia,  setEditDia]  = useState('Sábado');
  const [editHora, setEditHora] = useState('8:00 PM');
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { restaurante, sugerencia, recomendacion } = suggestion;

  // Determinar estado de aceptación
  const allPhotos = [
    ...(restaurante.foto_portada ? [restaurante.foto_portada] : []),
    ...(restaurante.fotos || []),
  ];
  const currentPhoto = allPhotos[photoIndex]?.url;

  const isAccepted = recomendacion.estado === 'aceptada';
  const myPosition = suggestion.usuarios?.indexOf(myId ?? '') ?? -1;
  const iAccepted = myPosition === 0
    ? recomendacion.user1Acepta
    : myPosition === 1
      ? recomendacion.user2Acepta
      : recomendacion.user1Acepta || recomendacion.user2Acepta;

  // Abrir el editor precargando el día/hora actuales de la sugerencia
  const openEditDate = () => {
    const fechaActual = sugerencia.fecha || 'Sábado 8:00 PM';
    const [dia, ...resto] = fechaActual.split(' ');
    if (DIAS_CITA.includes(dia)) setEditDia(dia);
    const hora = resto.join(' ');
    if (HORAS_CITA.includes(hora)) setEditHora(hora);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEditDate(true);
  };

  const saveEditDate = async () => {
    if (savingDate) return;
    setSavingDate(true);
    const ok = await onEditDate(`${editDia} ${editHora}`);
    setSavingDate(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditDate(false);
    } else {
      Alert.alert('Error', 'No se pudo actualizar la fecha. Intenta de nuevo.');
    }
  };

  return (
    <Animated.View style={[
      s.dateCardWrap,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
    ]}>
      <LinearGradient
        colors={isDark
          ? ['rgba(139,92,246,0.12)', 'rgba(253,41,123,0.08)', 'rgba(13,13,26,0.95)']
          : ['rgba(253,41,123,0.06)', 'rgba(139,92,246,0.04)', 'rgba(255,255,255,0.95)']
        }
        style={[s.dateCard, { borderColor: isDark ? 'rgba(139,92,246,0.25)' : 'rgba(253,41,123,0.15)' }]}
      >
        {/* ── Sparkle Header ─────────────────────────────────────────── */}
        <View style={s.dateHeader}>
          <Sparkles size={18} color="#8B5CF6" />
          <Text style={[s.dateHeaderText, { color: colors.text }]}>
            ¡Sugerencia de Primera Cita!
          </Text>
          <Sparkles size={18} color="#FD297B" />
        </View>

        {/* ── Mensaje personalizado ───────────────────────────────────── */}
        {sugerencia.mensaje && (
          <View style={[s.dateMsgBox, { backgroundColor: isDark ? 'rgba(253,41,123,0.1)' : 'rgba(253,41,123,0.06)' }]}>
            <Text style={[s.dateMsgText, { color: colors.primary }]}>
              {sugerencia.mensaje}
            </Text>
          </View>
        )}

        {/* ── Foto del restaurante ───────────────────────────────────── */}
        {allPhotos.length > 0 && (
          <View style={s.datePhotoWrap}>
            {currentPhoto && (
              <Image source={{ uri: currentPhoto }} style={s.datePhoto} resizeMode="cover" />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={s.datePhotoOverlay}
            />
            {allPhotos.length > 1 && (
              <View style={s.datePhotoNav}>
                {allPhotos.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.datePhotoDot, i === photoIndex && s.datePhotoDotActive]}
                    onPress={() => setPhotoIndex(i)}
                  />
                ))}
              </View>
            )}
            {/* Swipe arrows */}
            {photoIndex > 0 && (
              <TouchableOpacity style={[s.datePhotoArrow, s.datePhotoArrowLeft]} onPress={() => setPhotoIndex(photoIndex - 1)}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {photoIndex < allPhotos.length - 1 && (
              <TouchableOpacity style={[s.datePhotoArrow, s.datePhotoArrowRight]} onPress={() => setPhotoIndex(photoIndex + 1)}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Info del restaurante ────────────────────────────────────── */}
        <View style={s.dateInfo}>
          <Text style={[s.dateRestName, { color: colors.text }]}>
            {restaurante.nombre || 'Restaurante'}
          </Text>

          <View style={s.dateTagsRow}>
            {restaurante.categoria ? (
              <View style={[s.dateTag, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="pricetag" size={11} color={colors.primary} />
                <Text style={[s.dateTagText, { color: colors.primary }]}>{restaurante.categoria}</Text>
              </View>
            ) : null}
            {restaurante.ambiente ? (
              <View style={[s.dateTag, { backgroundColor: colors.secondary + '15' }]}>
                <Ionicons name="sparkles" size={11} color={colors.secondary} />
                <Text style={[s.dateTagText, { color: colors.secondary }]}>{restaurante.ambiente}</Text>
              </View>
            ) : null}
            {restaurante.precio_promedio ? (
              <View style={[s.dateTag, { backgroundColor: '#10B98115' }]}>
                <Text style={[s.dateTagText, { color: '#10B981' }]}>{restaurante.precio_promedio}</Text>
              </View>
            ) : null}
          </View>

          {restaurante.direccion ? (
            <View style={s.dateDetailRow}>
              <Ionicons name="location" size={14} color={colors.textDim} />
              <Text style={[s.dateDetailText, { color: colors.textDim }]} numberOfLines={1}>
                {restaurante.direccion}
              </Text>
            </View>
          ) : null}

          {restaurante.horario ? (
            <View style={s.dateDetailRow}>
              <Ionicons name="time" size={14} color={colors.textDim} />
              <Text style={[s.dateDetailText, { color: colors.textDim }]}>
                {restaurante.horario}
              </Text>
            </View>
          ) : null}

          {/* ── Fecha sugerida (editable mientras no esté confirmada) ── */}
          <View style={[s.dateSuggestionBox, {
            backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.06)',
            borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)',
          }]}>
            <Ionicons name="calendar" size={18} color={colors.secondary} />
            <Text style={[s.dateSuggestionText, { color: colors.text, flex: 1 }]}>
              {sugerencia.fecha || 'Sábado 8:00 PM'}
            </Text>
            {!isAccepted && (
              <TouchableOpacity
                onPress={openEditDate}
                disabled={dateLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[s.dateEditBtn, { backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)' }]}
              >
                <Ionicons name="pencil" size={15} color={colors.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Menú preview ──────────────────────────────────────── */}
          {restaurante.menu && restaurante.menu.length > 0 && (
            <View style={s.dateMenuSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <UtensilsCrossed size={12} color={colors.textDim} />
                <Text style={[s.dateMenuTitle, { color: colors.textDim, marginBottom: 0 }]}>Menú destacado</Text>
              </View>
              {restaurante.menu.map((plato, i) => (
                <View key={i} style={s.dateMenuItem}>
                  <Text style={[s.dateMenuName, { color: colors.text }]}>{plato.nombre}</Text>
                  {plato.precio ? (
                    <Text style={[s.dateMenuPrice, { color: colors.primary }]}>{plato.precio}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Estado de aceptación ────────────────────────────────── */}
        {isAccepted ? (
          <View style={[s.dateAcceptedBox, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={[s.dateAcceptedText, { color: '#10B981' }]}>
              ¡Cita confirmada! Ambos aceptaron
            </Text>
          </View>
        ) : (
          <>
            {/* Status indicators */}
            {(recomendacion.user1Acepta || recomendacion.user2Acepta) && (
              <View style={[s.dateWaitingBox, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="hourglass" size={16} color="#F59E0B" />
                <Text style={[s.dateWaitingText, { color: '#F59E0B' }]}>
                  {iAccepted
                    ? 'Esperando que tu match acepte...'
                    : 'Tu match ya aceptó ¡Es tu turno!'}
                </Text>
              </View>
            )}

            {/* ── Botones de acción ──────────────────────────────── */}
            <View style={s.dateBtnRow}>
              <TouchableOpacity
                style={[s.dateBtn, s.dateBtnAccept]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAccept(); }}
                disabled={dateLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.dateBtnGradient}
                >
                  {dateLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="heart" size={18} color="#fff" />
                      <Text style={s.dateBtnAcceptText}>¡Ir!</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.dateBtn, s.dateBtnAlt, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                  borderColor: colors.glassBorder,
                }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNewPlace(); }}
                disabled={dateLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color={colors.text} />
                <Text style={[s.dateBtnAltText, { color: colors.text }]}>Otro lugar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </LinearGradient>

      {/* ── Modal para editar día y hora de la cita ─────────────────── */}
      <Modal
        visible={showEditDate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditDate(false)}
        statusBarTranslucent
      >
        <Pressable style={ed.backdrop} onPress={() => setShowEditDate(false)}>
          <Pressable onPress={() => {}}>
            <View style={[ed.sheet, { backgroundColor: isDark ? '#1A1626' : '#FFFFFF' }]}>
              <View style={ed.headerRow}>
                <Ionicons name="calendar" size={18} color={colors.secondary} />
                <Text style={[ed.title, { color: colors.text }]}>Editar cita</Text>
              </View>
              <Text style={[ed.subtitle, { color: colors.textDim }]}>
                Propón el día y la hora que mejor les quede. Tu match deberá aceptar el cambio.
              </Text>

              <Text style={[ed.label, { color: colors.textDim }]}>DÍA</Text>
              <View style={ed.chipsWrap}>
                {DIAS_CITA.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      ed.chip,
                      { borderColor: colors.glassBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                      editDia === d && { borderColor: colors.secondary, backgroundColor: `${colors.secondary}20` },
                    ]}
                    onPress={() => { setEditDia(d); Haptics.selectionAsync(); }}
                  >
                    <Text style={[
                      ed.chipText,
                      { color: colors.textDim },
                      editDia === d && { color: colors.secondary, fontWeight: '800' },
                    ]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[ed.label, { color: colors.textDim }]}>HORA</Text>
              <View style={ed.chipsWrap}>
                {HORAS_CITA.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      ed.chip,
                      { borderColor: colors.glassBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                      editHora === h && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
                    ]}
                    onPress={() => { setEditHora(h); Haptics.selectionAsync(); }}
                  >
                    <Text style={[
                      ed.chipText,
                      { color: colors.textDim },
                      editHora === h && { color: colors.primary, fontWeight: '800' },
                    ]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[ed.previewBox, { backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.07)' }]}>
                <Ionicons name="time" size={15} color={colors.secondary} />
                <Text style={[ed.previewText, { color: colors.text }]}>{editDia} {editHora}</Text>
              </View>

              <View style={ed.btnRow}>
                <TouchableOpacity
                  style={[ed.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F2F2F7' }]}
                  onPress={() => setShowEditDate(false)}
                  disabled={savingDate}
                >
                  <Text style={[ed.cancelText, { color: colors.textDim }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ed.saveBtn} onPress={saveEditDate} disabled={savingDate} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={ed.saveGradient}
                  >
                    {savingDate
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={ed.saveText}>Guardar</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

// ── Estilos del editor de cita ─────────────────────────────────────────────────
const ed = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    width: '100%',
    borderRadius: 22,
    padding: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  previewBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, borderRadius: 12, marginBottom: 16,
  },
  previewText: { fontSize: 15, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700' },
  saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  saveGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ── Burbuja de mensaje ────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, colors, isDark }: { msg: any; isMe: boolean; colors: any; isDark: boolean }) {
  const time = new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const isPhoto = msg.content.startsWith('[Foto compartida]');
  const photoUri = isPhoto ? msg.content.split('\n')[1] : null;

  return (
    <View style={[s.bubbleRow, isMe && s.bubbleRowMe]}>
      {isMe ? (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.bubble, s.bubbleMe]}
        >
          {isPhoto && photoUri && (
            <Image source={{ uri: photoUri }} style={s.bubbleImage} resizeMode="cover" />
          )}
          {!isPhoto && (
            <Text style={[s.bubbleText, { color: 'white' }]}>{msg.content}</Text>
          )}
          <View style={s.bubbleMeta}>
            <Text style={[s.bubbleTime, { color: 'rgba(255,255,255,0.65)' }]}>{time}</Text>
            <Ionicons
              name={msg.is_read ? 'checkmark-done' : 'checkmark'}
              size={13}
              color="rgba(255,255,255,0.65)"
              style={{ marginLeft: 3 }}
            />
          </View>
        </LinearGradient>
      ) : (
        <View style={[s.bubble, s.bubbleThem, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
          borderColor: colors.glassBorder,
        }]}>
          {isPhoto && photoUri && (
            <Image source={{ uri: photoUri }} style={s.bubbleImage} resizeMode="cover" />
          )}
          {!isPhoto && (
            <Text style={[s.bubbleText, { color: colors.text }]}>{msg.content}</Text>
          )}
          <View style={s.bubbleMeta}>
            <Text style={[s.bubbleTime, { color: colors.textDim }]}>{time}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Vista previa de foto de perfil (estilo WhatsApp) ──────────────────────────
function PhotoPreviewModal({
  visible, photo, name, onClose, onCall, onVideoCall, colors, isDark,
}: {
  visible: boolean;
  photo?: string;
  name?: string;
  onClose: () => void;
  onCall: () => void;
  onVideoCall: () => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={pp.backdrop} onPress={onClose}>
        {/* Pressable vacío para que tocar la tarjeta no cierre el modal */}
        <Pressable onPress={() => {}}>
          <View style={pp.card}>
            <View>
              <Image
                source={{ uri: photo || 'https://via.placeholder.com/300' }}
                style={pp.image}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.65)', 'transparent']}
                style={pp.nameBar}
              >
                <Text style={pp.nameText} numberOfLines={1}>{name}</Text>
              </LinearGradient>
            </View>
            <View style={[pp.actions, { backgroundColor: isDark ? '#1A1626' : '#FFFFFF' }]}>
              <TouchableOpacity style={pp.actionBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={pp.actionBtn} onPress={onCall} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="call" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={pp.actionBtn} onPress={onVideoCall} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="videocam" size={26} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ userId: string; name: string; photo: string; icebreaker?: string; streak?: string }>();
  const { userId, name, photo, icebreaker, streak: streakParam } = params;
  const {
    messages, loading, sending, sendMessage, myId, matchId,
    dateSuggestion, dateLoading, acceptDate, requestNewPlace, editDate,
    mensajeRechazado, clearMensajeRechazado, deleteConversation,
  } = useChat(userId);
  const { online, lastSeen } = usePresence(userId);
  const { socket } = useSocket();
  const insets = useSafeAreaInsets();
  const [input,  setInput]  = useState('');
  const [streak, setStreak] = useState(Number(streakParam ?? 0));
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  // true mientras el usuario está pegado al final de la lista. Los auto-scrolls
  // solo se disparan en ese caso: si está leyendo mensajes antiguos (o la
  // tarjeta de cita), nada debe regresarlo al fondo.
  const nearBottomRef = useRef(true);
  const { initiateCall } = useCall();
  const [imageUploading, setImageUploading] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Pre-fill input with icebreaker question if navigated from MatchModal
  useEffect(() => {
    if (icebreaker) setInput(icebreaker);
  }, []);

  // Escuchar actualizaciones de racha — solo de esta conversación
  useEffect(() => {
    if (!socket) return;
    const handler = ({ matchId: updatedMatchId, streak: newStreak }: { matchId: string; streak: number }) => {
      if (!matchId || updatedMatchId === matchId) setStreak(newStreak);
    };
    socket.on('streak:update', handler);
    return () => { socket.off('streak:update', handler); };
  }, [socket, matchId]);

  // Actualizar mejor racha localmente cuando cambia
  useEffect(() => {
    if (streak > 0) updateBestStreak(streak);
  }, [streak]);

  // ── Alerta de mensaje rechazado por moderación ───────────────────────────────
  useEffect(() => {
    if (!mensajeRechazado) return;
    Alert.alert(
      'Mensaje no enviado',
      'Tu mensaje contiene lenguaje inapropiado. Por favor sé respetuoso con los demás.',
      [{ text: 'Entendido', onPress: clearMensajeRechazado }]
    );
  }, [mensajeRechazado]);

  // ── Keyboard listeners para Android ─────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setShowEmoji(false);
      if (nearBottomRef.current) {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (messages.length > 0 && nearBottomRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  // Scroll cuando APARECE la sugerencia de cita (o cambia de restaurante).
  // Se usa una clave estable en vez del objeto: el polling de respaldo crea
  // objetos nuevos idénticos y antes esto forzaba scrollToEnd repetidamente,
  // "rompiendo" el desplazamiento del chat.
  const suggestionKey = dateSuggestion
    ? `${dateSuggestion.matchId}:${dateSuggestion.recomendacion?.restauranteId ?? ''}`
    : null;
  useEffect(() => {
    if (suggestionKey) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300);
    }
  }, [suggestionKey]);

  // Mantener actualizado si el usuario está al final de la lista
  const handleListScroll = useCallback((e: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    nearBottomRef.current =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
  }, []);

  const handleSend = useCallback((textOverride?: string) => {
    const text = (textOverride || input).trim();
    if (!text || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setShowEmoji(false);
    sendMessage(text).then(() => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    incrementMessagesSent(); // conteo local para logros
  }, [input, sending, sendMessage]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUploading(true);
      try {
        const fileUri = result.assets[0].uri;
        const fileName = fileUri.split('/').pop() || 'photo.jpg';
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const res = await api.uploadFile<{ url: string }>(
          '/chat/upload',
          { uri: fileUri, name: fileName, type: fileType },
          'photo'
        );
        if (res?.url) {
          await sendMessage(`[Foto compartida]\n${res.url}`);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        } else {
          Alert.alert('Error', 'No se pudo subir la imagen.');
        }
      } catch (err) {
        console.error('Error uploading chat image:', err);
        Alert.alert('Error', 'Hubo un problema al subir la imagen.');
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleBlock = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      `Bloquear a ${name}`,
      'Esta persona no podrá enviarte mensajes ni ver tu perfil. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/block/${userId}`, {});
              Alert.alert('Bloqueado', `Has bloqueado a ${name}.`);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'No se pudo bloquear. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteConversation = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Eliminar conversación',
      `Se borrarán todos los mensajes con ${name}. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'No se pudo eliminar la conversación. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  const handleStartCall = (isVideo: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    initiateCall(userId, name, photo, isVideo);
  };

  const handleEmojiToggle = () => {
    if (!showEmoji) {
      Keyboard.dismiss();
      setTimeout(() => setShowEmoji(true), 150);
    } else {
      setShowEmoji(false);
      inputRef.current?.focus();
    }
  };


  if (loading && messages.length === 0) return (
    <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Fondo gradiente sutil ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={isDark
          ? ['#0D0D1A', '#12091F', '#0D0D1A']
          : ['#F9F9FB', '#FFFFFF', '#F9F9FB']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={[s.header, {
          paddingTop: insets.top + 6,
          backgroundColor: isDark ? 'rgba(13,13,26,0.97)' : 'rgba(255,255,255,0.97)',
          borderBottomColor: colors.glassBorder,
        }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={s.headerUser} activeOpacity={0.8}>
            <TouchableOpacity
              style={s.avatarWrap}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Keyboard.dismiss();
                setShowPhotoPreview(true);
              }}
            >
              <Image source={{ uri: photo || 'https://via.placeholder.com/150' }} style={s.headerAvatar} />
              {online && <View style={[s.onlineDot, { backgroundColor: colors.success }]} />}
            </TouchableOpacity>
            <View style={s.headerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.headerName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                {streak > 0 && (
                  <View style={s.streakBadge}>
                    <Flame size={10} color="#FF6B00" fill="#FF6B00" />
                    <Text style={s.streakBadgeText}>{streak}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.headerStatus, { color: online ? colors.success : colors.textDim }]}>
                {online ? '● En línea' : lastSeenText(false, lastSeen)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={s.headerActions}>
            <TouchableOpacity
              style={[s.callBtn, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(253,41,123,0.08)' }]}
              onPress={() => handleStartCall(false)}
            >
              <Ionicons name="call" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.callBtn, { backgroundColor: isDark ? 'rgba(217,70,239,0.15)' : 'rgba(255,101,91,0.08)' }]}
              onPress={() => handleStartCall(true)}
            >
              <Ionicons name="videocam" size={20} color={colors.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.callBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => setShowOptionsMenu(true)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Lista de mensajes ─────────────────────────────────────────────── */}
        <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setShowEmoji(false); }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={[s.messageList, { paddingBottom: 16 }]}
            renderItem={({ item }) => (
              <MessageBubble
                msg={item}
                isMe={item.sender_id === myId}
                colors={colors}
                isDark={isDark}
              />
            )}
            showsVerticalScrollIndicator={false}
            onScroll={handleListScroll}
            scrollEventThrottle={64}
            onContentSizeChange={() => {
              // Solo seguir el contenido si el usuario ya estaba al final;
              // si está leyendo arriba, no lo regresamos al fondo.
              if (nearBottomRef.current) {
                listRef.current?.scrollToEnd({ animated: false });
              }
            }}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              dateSuggestion ? (
                <DateSuggestionCard
                  suggestion={dateSuggestion}
                  myId={myId}
                  onAccept={() => acceptDate(dateSuggestion.matchId)}
                  onNewPlace={() => requestNewPlace(dateSuggestion.matchId)}
                  onEditDate={(fecha) => editDate(dateSuggestion.matchId, fecha)}
                  dateLoading={dateLoading}
                  colors={colors}
                  isDark={isDark}
                />
              ) : null
            }
          />
        </Pressable>

        {/* ── Emoji picker ──────────────────────────────────────────────────── */}
        {showEmoji && (
          <View style={[s.emojiPicker, { backgroundColor: isDark ? '#13101E' : '#F5F5F8', borderTopColor: colors.glassBorder }]}>
            <View style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} onPress={() => handleSend(e)} style={s.emojiItem}>
                  <Text style={s.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Barra de entrada ──────────────────────────────────────────────── */}
        <View style={[s.inputBar, {
          backgroundColor: isDark ? 'rgba(13,13,26,0.98)' : 'rgba(255,255,255,0.98)',
          borderTopColor: colors.glassBorder,
          paddingBottom: Platform.OS === 'ios'
            ? (showEmoji ? 12 : insets.bottom + 4)
            : insets.bottom + 6,
          // Android: cuando el KAV en modo 'height' no se ajusta perfectamente
          marginBottom: Platform.OS === 'android' && keyboardHeight > 0 ? 0 : 0,
        }]}>
          {imageUploading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 6, marginBottom: 4 }} />
          ) : (
            <TouchableOpacity onPress={handlePickImage} style={s.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="image-outline" size={24} color={colors.textDim} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleEmojiToggle} style={s.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={showEmoji ? 'keypad-outline' : 'happy-outline'} size={24} color={showEmoji ? colors.primary : colors.textDim} />
          </TouchableOpacity>

          <View style={[s.inputWrap, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            borderColor: colors.glassBorder,
          }]}>
            <TextInput
              ref={inputRef}
              style={[s.input, { color: colors.text }]}
              placeholder="Escribe algo..."
              placeholderTextColor={colors.textDim}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              onFocus={() => setShowEmoji(false)}
              submitBehavior="newline"
            />
          </View>

          <TouchableOpacity
            style={[s.sendBtn, { opacity: (!input.trim() && !sending) ? 0.45 : 1 }]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.sendGradient}
            >
              {sending
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="send" size={18} color="white" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Vista previa de foto de perfil ──────────────────────────────────── */}
      <PhotoPreviewModal
        visible={showPhotoPreview}
        photo={photo}
        name={name}
        onClose={() => setShowPhotoPreview(false)}
        onCall={() => { setShowPhotoPreview(false); handleStartCall(false); }}
        onVideoCall={() => { setShowPhotoPreview(false); handleStartCall(true); }}
        colors={colors}
        isDark={isDark}
      />

      {/* ── Menú de opciones (Reportar / Bloquear) ───────────────────────────── */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
        statusBarTranslucent
      >
        <Pressable style={om.backdrop} onPress={() => setShowOptionsMenu(false)}>
          <Pressable onPress={() => {}}>
            <View style={[om.sheet, { backgroundColor: isDark ? '#1A1626' : '#FFFFFF' }]}>
              <Text style={[om.title, { color: colors.textDim }]} numberOfLines={1}>
                {name}
              </Text>

              <TouchableOpacity
                style={[om.option, { borderBottomColor: colors.glassBorder }]}
                onPress={() => { setShowOptionsMenu(false); setShowReport(true); }}
              >
                <Ionicons name="flag-outline" size={22} color="#FF9500" />
                <Text style={[om.optionText, { color: colors.text }]}>Reportar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[om.option, { borderBottomColor: colors.glassBorder }]}
                onPress={handleDeleteConversation}
              >
                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                <Text style={[om.optionText, { color: colors.text }]}>Eliminar conversación</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={om.option}
                onPress={handleBlock}
              >
                <Ionicons name="ban-outline" size={22} color="#FF3B30" />
                <Text style={[om.optionText, { color: '#FF3B30' }]}>Bloquear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[om.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F2F2F7' }]}
                onPress={() => setShowOptionsMenu(false)}
              >
                <Text style={[om.cancelText, { color: colors.textDim }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal de reporte ─────────────────────────────────────────────────── */}
      <ReportModal
        visible={showReport}
        userId={userId}
        userName={name}
        onClose={() => setShowReport(false)}
        onReported={() => {
          setShowReport(false);
          Alert.alert('Gracias', 'Tu reporte fue enviado. Lo revisaremos pronto.');
        }}
      />
    </View>
  );
}

// ── Estilos del menú de opciones ──────────────────────────────────────────────
const om = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 6,
  },
  title: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontSize: 16, fontWeight: '600' },
  cancelBtn: {
    margin: 10,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '700' },
});

// ── Estilos de la vista previa de foto ────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const PREVIEW_W = Math.min(SCREEN_W * 0.72, 320);

const pp = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: PREVIEW_W,
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: boxShadow('#000', 10, 30, 0.4),
  },
  image: { width: PREVIEW_W, height: PREVIEW_W, backgroundColor: '#222' },
  nameBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 26,
  },
  nameText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  actionBtn: { padding: 8 },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 6, marginRight: 2 },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  avatarWrap: { position: 'relative' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21 },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  headerInfo: { marginLeft: 10, flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerStatus: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  streakBadge: {
    backgroundColor:   'rgba(255,107,0,0.12)',
    borderRadius:      10,
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderWidth:       1,
    borderColor:       'rgba(255,107,0,0.30)',
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
  },
  streakBadgeText: { fontSize: 11, fontWeight: '800', color: '#FF6B00' },
  headerActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  callBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },

  // Message list
  messageList: { paddingHorizontal: 14, paddingTop: 14 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '76%', padding: 11, borderRadius: 20, overflow: 'hidden' },
  bubbleMe: { borderBottomRightRadius: 5 },
  bubbleThem: { borderBottomLeftRadius: 5, borderWidth: StyleSheet.hairlineWidth },
  bubbleImage: { width: 210, height: 170, borderRadius: 14, marginBottom: 6 },
  bubbleText: { fontSize: 15.5, lineHeight: 22, fontWeight: '400' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  bubbleTime: { fontSize: 10.5, fontWeight: '500' },

  // Date suggestion card
  dateCardWrap: { marginTop: 10, marginBottom: 10 },
  dateCard: {
    borderRadius: 24, padding: 18, borderWidth: 1,
    boxShadow: boxShadow('#8B5CF6', 8, 20, 0.12),
  },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 12,
  },
  dateHeaderText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  dateMsgBox: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    marginBottom: 14, alignItems: 'center',
  },
  dateMsgText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  datePhotoWrap: {
    height: 170, borderRadius: 18, overflow: 'hidden',
    marginBottom: 14, position: 'relative',
  },
  datePhoto: { width: '100%', height: '100%' },
  datePhotoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
  },
  datePhotoNav: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  datePhotoDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  datePhotoDotActive: { backgroundColor: '#fff', width: 18 },
  datePhotoArrow: {
    position: 'absolute', top: '50%', marginTop: -16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  datePhotoArrowLeft: { left: 8 },
  datePhotoArrowRight: { right: 8 },

  dateInfo: { marginBottom: 12 },
  dateRestName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 },
  dateTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  dateTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  dateTagText: { fontSize: 12, fontWeight: '700' },
  dateDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dateDetailText: { fontSize: 13, fontWeight: '500', flex: 1 },

  dateSuggestionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, marginTop: 8,
  },
  dateSuggestionText: { fontSize: 16, fontWeight: '800' },
  dateEditBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },

  dateMenuSection: { marginTop: 12 },
  dateMenuTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  dateMenuItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dateMenuName: { fontSize: 13, fontWeight: '600' },
  dateMenuPrice: { fontSize: 13, fontWeight: '700' },

  dateAcceptedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    marginTop: 4,
  },
  dateAcceptedText: { fontSize: 14, fontWeight: '700', flex: 1 },

  dateWaitingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    marginBottom: 10,
  },
  dateWaitingText: { fontSize: 13, fontWeight: '600', flex: 1 },

  dateBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dateBtn: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  dateBtnAccept: {},
  dateBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  dateBtnAcceptText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  dateBtnAlt: {
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6, paddingVertical: 14, borderRadius: 18,
  },
  dateBtnAltText: { fontSize: 14, fontWeight: '700' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 6, marginBottom: 4 },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 120,
  },
  input: { fontSize: 15.5, lineHeight: 20 },
  sendBtn: { marginBottom: 4 },
  sendGradient: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },

  // Emoji picker
  emojiPicker: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  emojiItem: { padding: 8 },
  emojiText: { fontSize: 28 },
});