// LikesScreen.tsx - Classic
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLikes } from '../../hooks/useLikes';
import { api } from '../services/api';
import { getAge, relativeTime } from '../utils/age';
import ReportModal from '../report/ReportModal';
import UserProfileModal from '../discover/UserProfileModal';
import { UserProfile } from '../types';

const { width: W } = Dimensions.get('window');

function LikeCard({
  usuario, liked_at, onLikeBack, onReport, isLiking, onPress
}: {
  usuario: UserProfile; liked_at: string; onLikeBack: () => void; onReport: () => void; isLiking: boolean; onPress: () => void;
}) {
  const age  = getAge(usuario.birth_date);
  const time = relativeTime(liked_at);

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={onPress}>
      <View style={s.avatarWrap}>
        {usuario.profile_picture ? (
          <Image source={{ uri: typeof usuario.profile_picture === 'object' && usuario.profile_picture !== null ? usuario.profile_picture.url : usuario.profile_picture }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person" size={32} color="#8E8E93" />
          </View>
        )}
        <View style={s.heartBadge}>
          <Ionicons name="heart" size={14} color="#fff" />
        </View>
      </View>

      <View style={s.info}>
        <Text style={s.name}>
          {usuario.first_name || usuario.username}{age ? `, ${age}` : ''}
          {usuario.is_verified && <Ionicons name="checkmark-circle" size={16} color="#007AFF" />}
        </Text>
        <Text style={s.timeText}>Te dio like hace {time}</Text>
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={s.likeBtn} onPress={onLikeBack} disabled={isLiking}>
          {isLiking ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="heart" size={24} color="#fff" />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function LikesScreen() {
  const { likes, loading, refetch } = useLikes();
  const [reportTarget, setReportTarget] = useState<UserProfile | null>(null);
  const [previewProfile, setPreviewProfile] = useState<UserProfile | null>(null);
  const [liking, setLiking] = useState<string | null>(null);

  const handleLikeBack = async (usuario: UserProfile) => {
    if (liking) return;
    setLiking(usuario.id);
    try {
      const res = await api.post<{ esMatch: boolean; matchId?: string }>(`/matches/like/${usuario.id}`, {});
      await refetch();
      if (res.esMatch) {
        router.push({
          pathname: '/chat/[userId]',
          params: {
            userId: usuario.id,
            name: usuario.first_name || usuario.username,
            photo: typeof usuario.profile_picture === 'object' && usuario.profile_picture !== null ? usuario.profile_picture.url : (usuario.profile_picture ?? ''),
          },
        });
      }
    } catch (e) {
      console.error("Error liking back:", e);
    } finally { 
      setLiking(null); 
      setPreviewProfile(null);
    }
  };

  const handlePass = async (usuario: UserProfile) => {
    try {
      // Usamos el mismo endpoint que en Discover si es posible, o uno específico para "descartar" likes
      await api.post(`/matches/dislike/${usuario.id}`, {});
      await refetch();
    } catch (e) {
      console.error("Error passing user:", e);
    } finally {
      setPreviewProfile(null);
    }
  };

  if (loading && likes.length === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#FF2D55" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <View>
          <Text style={s.logo}>Debuta</Text>
          <Text style={s.subtitle}>Te gustaron</Text>
        </View>
      </View>

      <FlatList
        data={likes}
        keyExtractor={item => item.matchId}
        onRefresh={refetch}
        refreshing={loading}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={s.emptyWrap}>
              <Ionicons name="heart-outline" size={80} color="#F2F2F7" />
              <Text style={s.emptyTitle}>Aún sin likes</Text>
              <Text style={s.emptySub}>Cuando alguien te dé like aparecerá aquí.</Text>
              <TouchableOpacity style={s.discoverBtn} onPress={() => router.push('/(tabs)/')}>
                <Text style={s.discoverBtnText}>Explorar perfiles</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <LikeCard
            usuario={item.usuario}
            liked_at={item.liked_at}
            isLiking={liking === item.usuario.id}
            onLikeBack={() => handleLikeBack(item.usuario)}
            onReport={() => setReportTarget(item.usuario)}
            onPress={() => setPreviewProfile(item.usuario)}
          />
        )}
      />

      {reportTarget && (
        <ReportModal 
          visible={!!reportTarget} 
          userId={reportTarget.id} 
          userName={reportTarget.first_name || reportTarget.username} 
          onClose={() => setReportTarget(null)} 
          onReported={refetch} 
        />
      )}

      <UserProfileModal 
        visible={!!previewProfile} 
        profile={previewProfile} 
        onClose={() => setPreviewProfile(null)} 
        onLike={() => { if (previewProfile) handleLikeBack(previewProfile); }} 
        onPass={() => { if (previewProfile) handlePass(previewProfile); }} 
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 24, paddingVertical: 15 },
  logo: { fontSize: 28, fontWeight: '900', letterSpacing: 1, color: '#FF2D55' },
  subtitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: 20, 
    marginVertical: 8, 
    borderRadius: 24, 
    padding: 15, 
    backgroundColor: '#FFFFFF',
    borderWidth: 1, 
    borderColor: '#F2F2F7',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 5 
  },
  avatarWrap: { position: 'relative', marginRight: 15 },
  avatar: { width: 70, height: 70, borderRadius: 35 },
  heartBadge: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    width: 26, 
    height: 26, 
    borderRadius: 13, 
    backgroundColor: '#FF2D55',
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', marginBottom: 4, color: '#000' },
  timeText: { fontSize: 13, fontWeight: '700', color: '#FF2D55' },
  actions: { marginLeft: 10 },
  likeBtn: { 
    width: 54, 
    height: 54, 
    borderRadius: 27, 
    backgroundColor: '#FF2D55',
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 8 
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginTop: 20, color: '#000' },
  emptySub: { fontSize: 16, textAlign: 'center', marginTop: 10, fontWeight: '500', color: '#8E8E93' },
  discoverBtn: { marginTop: 25, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, backgroundColor: '#FF2D55' },
  discoverBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
});