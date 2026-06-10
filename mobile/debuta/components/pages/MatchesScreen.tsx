// MatchesScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, TextInput,
  Dimensions, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import { useMatches } from '../../hooks/useMatches';
import { relativeTime } from '../utils/age';
import { useTheme } from '../../theme/ThemeContext';

const { width: W } = Dimensions.get('window');

function PulsingOnlineDot({ borderColor }: { borderColor: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 2.1, duration: 980, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 980, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.onlineDotWrap}>
      <Animated.View style={[s.onlinePulseRing, { transform: [{ scale: pulse }] }]} />
      <View style={[s.onlineDot, { borderColor }]} />
    </View>
  );
}

function MatchAvatar({ uri, size = 56, online, colors }: any) {
  const imageUri = typeof uri === 'object' && uri !== null ? uri.url : uri;
  const radius = size / 2;
  return (
    <View>
      {imageUri ? (
        <Image source={{ uri: imageUri as string }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <View style={[s.avatarPlaceholder, { width: size, height: size, borderRadius: radius, backgroundColor: colors.card }]}>
          <Ionicons name="person" size={size * 0.45} color={colors.textDim} />
        </View>
      )}
      {online && <PulsingOnlineDot borderColor={colors.bg[0]} />}
    </View>
  );
}

function ChatRow({ match, onPress, colors }: any) {
  const unread  = (match.unread_count ?? 0) > 0;
  const user    = match.matched_user;
  const preview = match.last_message?.content ?? '¡Es un match! Di algo bonito...';
  const timeStr = match.last_message ? relativeTime(match.last_message.created_at) : '';
  const streak  = match.streak ?? 0;

  return (
    <TouchableOpacity
      style={[s.chatRow, { overflow: 'hidden' }]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {unread && (
        <>
          <LinearGradient
            colors={[`${colors.primary}1A`, 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 }}
            pointerEvents="none"
          />
        </>
      )}
      <View style={s.chatAvatarWrap}>
        <MatchAvatar uri={user.profile_picture} size={72} online={user.online} colors={colors} />
        {unread && (
          <LinearGradient colors={[colors.primary, colors.secondary]} style={s.unreadBadge}>
            <Text style={s.unreadText}>{match.unread_count}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={s.chatInfo}>
        <View style={s.chatInfoTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={[s.chatName, { color: colors.text }, unread && { fontWeight: '800' }]} numberOfLines={1}>
              {user.first_name || user.username}
            </Text>
            {streak > 0 && (
              <View style={s.streakPill}>
                <Flame size={10} color="#FF6B00" fill="#FF6B00" />
                <Text style={s.streakPillText}>{streak}</Text>
              </View>
            )}
          </View>
          <Text style={[s.chatTime, { color: colors.textDim }]}>{timeStr}</Text>
        </View>
        <Text
          style={[s.chatPreview, { color: unread ? colors.text : colors.textDim }, unread && { fontWeight: '600' }]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.glassBorder} />
    </TouchableOpacity>
  );
}

export default function MatchesScreen() {
  const { colors, isDark } = useTheme();
  const { matches, loading, refetch } = useMatches();
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const filtered = matches.filter(m => {
    const name = `${m.matched_user.first_name} ${m.matched_user.username}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const newMatches = matches.filter(m => !m.last_message);
  const activeChats = filtered.filter(m => m.last_message);

  if (loading && matches.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg[0] }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Mensajes</Text>
          <Text style={[s.subtitle, { color: colors.textLight }]}>
            {matches.length > 0 ? `${matches.length} conversaciones` : 'Conecta con tus matches'}
          </Text>
        </View>
        <TouchableOpacity style={[s.headerIcon, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }]}>
          <Ionicons name="options-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[s.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }]}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Buscar conversaciones..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={activeChats}
        keyExtractor={m => m.id}
        onRefresh={refetch}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            {newMatches.length > 0 && !search && (
              <View style={s.newMatchesSection}>
                <Text style={[s.sectionTitle, { color: colors.text, marginLeft: 20 }]}>Matches Nuevos</Text>
                <FlatList
                  horizontal
                  data={newMatches}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={m => `new-${m.id}`}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={s.newMatchItem}
                      onPress={() => router.push({
                        pathname: '/chat/[userId]',
                        params: {
                          userId: item.matched_user.id,
                          name: item.matched_user.first_name || item.matched_user.username,
                          photo: typeof item.matched_user.profile_picture === 'object' ? item.matched_user.profile_picture?.url : item.matched_user.profile_picture,
                        }
                      })}
                    >
                      <LinearGradient
                        colors={[colors.secondary, colors.primary, colors.secondary]}
                        style={s.newMatchGradientRing}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={[s.newMatchAvatarInner, { backgroundColor: colors.bg[0] }]}>
                          <MatchAvatar uri={item.matched_user.profile_picture} size={74} colors={colors} />
                        </View>
                      </LinearGradient>
                      <Text style={[s.newMatchName, { color: colors.text }]} numberOfLines={1}>
                        {item.matched_user.first_name || item.matched_user.username}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            {activeChats.length > 0 && (
              <Text style={[s.sectionTitle, { color: colors.text, marginTop: 10, marginLeft: 20 }]}>
                Conversaciones
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.emptyWrap}>
              <View style={[s.emptyIconCircle, { backgroundColor: colors.card }]}>
                <Ionicons name="chatbubbles-outline" size={50} color={colors.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No hay chats aún</Text>
              <Text style={[s.emptySub, { color: colors.textDim }]}>
                Cuando hagas match o envíes un mensaje aparecerán aquí.
              </Text>
              <TouchableOpacity 
                style={[s.exploreBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/')}
              >
                <Text style={s.exploreBtnText}>Explorar personas</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ChatRow
            match={item}
            colors={colors}
            onPress={() => router.push({
              pathname: '/chat/[userId]',
              params: {
                userId: item.matched_user.id,
                name:   item.matched_user.first_name || item.matched_user.username,
                photo:  typeof item.matched_user.profile_picture === 'object' && item.matched_user.profile_picture !== null
                          ? item.matched_user.profile_picture.url
                          : (item.matched_user.profile_picture ?? ''),
                streak: String(item.streak ?? 0),
              }
            })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 20,
    paddingTop:        6,
    paddingBottom:     14,
  },
  title:    { fontSize: 34, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 1 },
  headerIcon: {
    width:          42,
    height:         42,
    borderRadius:   21,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
  },
  searchContainer: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  20,
    marginBottom:      14,
    borderRadius:      16,
    paddingHorizontal: 14,
    height:            48,
    borderWidth:       1,
    gap:               10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2, marginBottom: 2 },
  newMatchesSection: { marginVertical: 6 },
  newMatchItem: { alignItems: 'center', marginRight: 14, width: 88 },
  newMatchGradientRing: {
    padding:      3,
    borderRadius: 43,
    marginBottom: 8,
  },
  newMatchAvatarInner: {
    borderRadius: 40,
    overflow:     'hidden',
  },
  newMatchName: { fontSize: 12, fontWeight: '700', textAlign: 'center', letterSpacing: 0.1 },
  chatRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 20,
    paddingVertical:   14,
  },
  chatAvatarWrap: { position: 'relative', marginRight: 14 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  onlineDotWrap: {
    position:       'absolute',
    bottom:         1,
    right:          1,
    width:          16,
    height:         16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  onlinePulseRing: {
    position:        'absolute',
    width:           16,
    height:          16,
    borderRadius:    8,
    backgroundColor: 'rgba(52,199,89,0.35)',
  },
  onlineDot: {
    width:           13,
    height:          13,
    borderRadius:    6.5,
    backgroundColor: '#34C759',
    borderWidth:     2.5,
  },
  unreadBadge: {
    position:          'absolute',
    top:               -3,
    right:             -3,
    minWidth:          22,
    height:            22,
    borderRadius:      11,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 5,
    borderWidth:       2.5,
    borderColor:       '#000',
  },
  unreadText: { color: 'white', fontSize: 10, fontWeight: '900' },
  streakPill: {
    backgroundColor:   'rgba(255,107,0,0.12)',
    borderRadius:      10,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       'rgba(255,107,0,0.28)',
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
  },
  streakPillText: { fontSize: 11, fontWeight: '800', color: '#FF6B00' },
  chatInfo:    { flex: 1, paddingRight: 8 },
  chatInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  chatName:    { fontSize: 16, fontWeight: '700' },
  chatTime:    { fontSize: 12, fontWeight: '500' },
  chatPreview: { fontSize: 14, lineHeight: 20 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 44 },
  emptyIconCircle: {
    width:          96,
    height:         96,
    borderRadius:   48,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   20,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  emptySub:   { fontSize: 15, textAlign: 'center', marginTop: 8, fontWeight: '500', lineHeight: 22 },
  exploreBtn: { marginTop: 28, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  exploreBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});