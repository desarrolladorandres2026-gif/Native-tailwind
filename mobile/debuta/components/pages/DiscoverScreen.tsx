// DiscoverScreen.tsx - Rediseño Premium
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';

import { useDiscover } from '../../hooks/useDiscover';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import SwipeCard     from '../discover/SwipeCard';
import ActionButtons from '../discover/ActionButtons';
import MatchModal    from '../discover/MatchModal';
import EmptyState    from '../discover/EmptyState';
import ReportModal   from '../report/ReportModal';
import UserProfileModal from '../discover/UserProfileModal';
import ProfileCompletionPrompt from '../profile/ProfileCompletionPrompt';
import { UserProfile } from '../types';

const { width: W } = Dimensions.get('window');

// 🎨 Paleta Premium Debuta
const C = {
  primary:      '#FD297B',
  secondary:    '#FF655B',
  gradient:     ['#FF5864', '#FF655B', '#FD297B'] as const,
  background:   '#F8F9FA',
  text:         '#000000',
  textSoft:     '#424242',
  textLight:    '#9E9E9E',
  white:        '#FFFFFF',
  glass:        'rgba(255, 255, 255, 0.9)',
  glassBorder:  'rgba(255, 255, 255, 0.5)',
};

// Coordenadas del usuario (luego reemplazar con expo-location)
const MY_LAT = 2.1532;
const MY_LON = -75.6148;

export default function DiscoverScreen() {
  const { profiles, loading, swiping, swipe, refetch } = useDiscover();
  const { completion } = useProfile();
  const { user } = useAuth();
  const router = useRouter();

  const [matchData, setMatchData] = useState<{
    name: string;
    userId: string;
    matchId: string;
    photo: string;
  } | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [reportTarget, setReportTarget] = useState<UserProfile | null>(null);
  const [previewProfile, setPreviewProfile] = useState<UserProfile | null>(null);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);

  // Refrescar al ganar foco (asegura que filtros nuevos se apliquen)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (completion.percentage < 100 && !hasShownPrompt && !loading) {
      const timer = setTimeout(() => {
        setShowCompletionPrompt(true);
        setHasShownPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [completion.percentage, loading, hasShownPrompt]);

  const handleSwipe = async (
    userId: string,
    direction: 'like' | 'dislike',
    name: string,
    profile: UserProfile,
  ) => {
    const result = await swipe(userId, direction);
    if (result?.esMatch && direction === 'like') {
      setMatchData({
        name,
        userId,
        matchId: result.matchId ?? '',
        photo:   profile.profile_picture?.url || '',
      });
      setShowMatch(true);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Buscando personas cerca de ti...</Text>
      </View>
    );
  }

  const topProfile = profiles[0] ?? null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe}>
        
        {/* ── Header Premium ── */}
        <View style={s.header}>
          <View style={s.logoWrapper}>
            <LinearGradient
              colors={C.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.logoDot}
            />
            <Text style={s.logoText}>Debuta</Text>
          </View>
          
          <TouchableOpacity style={s.headerBtn} activeOpacity={0.7} onPress={() => router.push('/settings')}>
            <View style={s.glassBtn}>
              <Ionicons name="options-outline" size={22} color={C.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 🚨 Banner de Verificación */}
        {!user?.is_verified && (
          <TouchableOpacity 
            style={s.verifyBanner} 
            activeOpacity={0.9}
            onPress={() => router.push('/settings')}
          >
            <LinearGradient
              colors={['#FD297B', '#FF655B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.verifyGradient}
            >
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={s.verifyText}>Verifica tu identidad para mayor seguridad</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <ProfileCompletionPrompt
          visible={showCompletionPrompt}
          percentage={completion.percentage}
          missingFields={completion.missing}
          onClose={() => setShowCompletionPrompt(false)}
        />

        {/* ── Stack de tarjetas ── */}
        <View style={s.cardStack}>
          {profiles.length === 0 ? (
            <EmptyState onRefresh={refetch} />
          ) : (
            profiles.slice(0, 3).map((profile, index) => (
              <SwipeCard
                key={profile.id || (profile as any)._id || index}
                profile={profile}
                isTop={index === 0}
                userLat={MY_LAT}
                userLon={MY_LON}
                onSwipe={(dir) =>
                  handleSwipe(
                    profile.id,
                    dir,
                    profile.first_name || profile.username,
                    profile,
                  )
                }
                onPress={() => setPreviewProfile(profile)}
              />
            )).reverse()
          )}
        </View>

        {/* ── Botones like/dislike ── */}
        {profiles.length > 0 && (
          <View style={s.footer}>
            <ActionButtons
              disabled={swiping}
              onDislike={() => {
                if (topProfile) handleSwipe(topProfile.id, 'dislike', topProfile.first_name || topProfile.username, topProfile);
              }}
              onLike={() => {
                if (topProfile) handleSwipe(topProfile.id, 'like', topProfile.first_name || topProfile.username, topProfile);
              }}
            />
          </View>
        )}

        {/* Modals */}
        <MatchModal 
          visible={showMatch} 
          name={matchData?.name ?? ''} 
          matchId={matchData?.matchId} 
          matchedUserId={matchData?.userId} 
          matchedPhoto={matchData?.photo} 
          onClose={() => setShowMatch(false)} 
        />
        
        {reportTarget && (
          <ReportModal 
            visible={!!reportTarget} 
            userId={reportTarget.id} 
            userName={reportTarget.first_name || reportTarget.username} 
            onClose={() => setReportTarget(null)} 
            onReported={() => refetch()} 
          />
        )}

        <UserProfileModal 
          visible={!!previewProfile} 
          profile={previewProfile} 
          onClose={() => setPreviewProfile(null)} 
          onLike={() => { if (previewProfile) { handleSwipe(previewProfile.id, 'like', previewProfile.first_name || previewProfile.username, previewProfile); setPreviewProfile(null); } }} 
          onPass={() => { if (previewProfile) { handleSwipe(previewProfile.id, 'dislike', previewProfile.first_name || previewProfile.username, previewProfile); setPreviewProfile(null); } }} 
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, gap: 15 },
  loadingText: { fontSize: 14, color: C.textLight, fontWeight: '600' },
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    zIndex: 10,
  },
  logoWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 10, height: 10, borderRadius: 5 },
  logoText: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -1 },
  headerBtn: { width: 44, height: 44, borderRadius: 22 },
  glassBtn: { 
    flex: 1, 
    backgroundColor: C.white, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardStack: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 5,
  },
  footer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  // Verification Banner
  verifyBanner: {
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  verifyText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});