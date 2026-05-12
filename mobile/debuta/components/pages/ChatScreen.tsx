// ChatScreen.tsx — Rediseño premium, no messenger
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
  Keyboard, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useChat } from '../../hooks/useChat';
import { usePresence } from '../../hooks/usePresence';
import { useCall } from '../../context/CallContext';
import { lastSeenText } from '../utils/age';
import { useTheme } from '../../theme/ThemeContext';

const EMOJIS = ['😀','😂','🥰','😎','😭','👍','❤️','🔥','✨','💯','🎉','💬'];

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

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ userId: string; name: string; photo: string }>();
  const { userId, name, photo } = params;
  const { messages, loading, sending, sendMessage, myId } = useChat(userId);
  const { online, lastSeen } = usePresence(userId);
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const { initiateCall } = useCall();

  // ── Keyboard listeners para Android ─────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setShowEmoji(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  const handleSend = useCallback((textOverride?: string) => {
    const text = (textOverride || input).trim();
    if (!text || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setShowEmoji(false);
    sendMessage(text).then(() => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [input, sending, sendMessage]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      sendMessage(`[Foto compartida]\n${result.assets[0].uri}`).then(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
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
            <View style={s.avatarWrap}>
              <Image source={{ uri: photo || 'https://via.placeholder.com/150' }} style={s.headerAvatar} />
              {online && <View style={[s.onlineDot, { backgroundColor: colors.success }]} />}
            </View>
            <View style={s.headerInfo}>
              <Text style={[s.headerName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
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
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
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
          <TouchableOpacity onPress={handlePickImage} style={s.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="image-outline" size={24} color={colors.textDim} />
          </TouchableOpacity>

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
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
              returnKeyType="send"
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
    </View>
  );
}

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