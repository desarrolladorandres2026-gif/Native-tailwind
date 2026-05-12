// MatchesScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, TextInput,
  Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMatches } from '../../hooks/useMatches';
import { relativeTime } from '../utils/age';
import { useTheme } from '../../theme/ThemeContext';

const { width: W } = Dimensions.get('window');

function MatchAvatar({ uri, size = 56, online, colors }: any) {
  const imageUri = typeof uri === 'object' && uri !== null ? uri.url : uri;
  return (
    <View>
      {imageUri ? (
        <Image source={{ uri: imageUri as string }} style={{ width: size, height: size, borderRadius: size * 0.4 }} />
      ) : (
        <View style={[s.avatarPlaceholder, { width: size, height: size, borderRadius: size * 0.4, backgroundColor: colors.card }]}>
          <Ionicons name="person" size={size * 0.45} color={colors.textDim} />
        </View>
      )}
      {online && <View style={[s.onlineDot, { borderColor: colors.bg[0] }]} />}
    </View>
  );
}

function ChatRow({ match, onPress, colors }: any) {
  const unread   = (match.unread_count ?? 0) > 0;
  const user     = match.matched_user;
  const preview  = match.last_message?.content ?? '¡Es un match! Di algo melo...';
  const timeStr  = match.last_message ? relativeTime(match.last_message.created_at) : '';

  return (
    <TouchableOpacity 
      style={[s.chatRow, { borderBottomColor: colors.glassBorder }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={s.chatAvatarWrap}>
        <MatchAvatar uri={user.profile_picture} size={68} online={user.online} colors={colors} />
        {unread && (
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={s.unreadBadge}
          >
            <Text style={s.unreadText}>{match.unread_count}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={s.chatInfo}>
        <View style={s.chatInfoTop}>
          <Text style={[s.chatName, { color: colors.text }, unread && { fontWeight: '800' }]} numberOfLines={1}>
            {user.first_name || user.username}
          </Text>
          <Text style={[s.chatTime, { color: colors.textDim }]}>{timeStr}</Text>
        </View>
        <Text 
          style={[
            s.chatPreview, 
            { color: unread ? colors.text : colors.textDim },
            unread && { fontWeight: '600' }
          ]} 
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.glassBorder} />
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
        <Text style={[s.title, { color: colors.text }]}>Mensajes</Text>
        <TouchableOpacity style={[s.headerIcon, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="options-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[s.searchContainer, { backgroundColor: colors.inputBg }]}>
        <Ionicons name="search" size={20} color={colors.textDim} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Buscar personas o mensajes..."
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
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
                      <View style={[s.newMatchAvatarWrap, { borderColor: colors.primary }]}>
                        <MatchAvatar uri={item.matched_user.profile_picture} size={76} colors={colors} />
                      </View>
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
                onPress={() => router.push('/(tabs)/')}
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
                name: item.matched_user.first_name || item.matched_user.username,
                photo: typeof item.matched_user.profile_picture === 'object' && item.matched_user.profile_picture !== null ? item.matched_user.profile_picture.url : (item.matched_user.profile_picture ?? ''),
              }
            })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15 
  },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: 20, 
    marginVertical: 10, 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    height: 50 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 5 },
  newMatchesSection: { marginVertical: 10 },
  newMatchItem: { alignItems: 'center', marginRight: 15, width: 85 },
  newMatchAvatarWrap: { 
    padding: 3, 
    borderWidth: 2.5, 
    borderRadius: 38,
    marginBottom: 8,
  },
  newMatchName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  chatRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  chatAvatarWrap: { position: 'relative', marginRight: 15 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  onlineDot: { 
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    width: 15, 
    height: 15, 
    borderRadius: 7.5, 
    backgroundColor: '#4CD964', 
    borderWidth: 2.5 
  },
  unreadBadge: { 
    position: 'absolute', 
    top: -2, 
    right: -2, 
    minWidth: 22, 
    height: 22, 
    borderRadius: 11, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff'
  },
  unreadText: { color: 'white', fontSize: 11, fontWeight: '900' },
  chatInfo: { flex: 1, paddingRight: 10 },
  chatInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  chatName: { fontSize: 17, fontWeight: '700' },
  chatTime: { fontSize: 12, fontWeight: '500' },
  chatPreview: { fontSize: 14, lineHeight: 20 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 24, fontWeight: '800' },
  emptySub: { fontSize: 16, textAlign: 'center', marginTop: 10, fontWeight: '500', lineHeight: 24 },
  exploreBtn: { marginTop: 30, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  exploreBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});