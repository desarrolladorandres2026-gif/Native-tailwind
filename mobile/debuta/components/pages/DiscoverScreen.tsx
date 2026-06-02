// DiscoverScreen.tsx - Rediseño Premium con Filtros y Undo
import React, { useState, useCallback } from 'react';
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
import { useSettings, Settings } from '../../hooks/useSettings';
import SwipeCard from '../discover/SwipeCard';
import ActionButtons from '../discover/ActionButtons';
import MatchModal from '../discover/MatchModal';
import EmptyState from '../discover/EmptyState';
import ReportModal from '../report/ReportModal';
import UserProfileModal from '../discover/UserProfileModal';
import ProfileCompletionPrompt from '../profile/ProfileCompletionPrompt';
import FilterFunnel from '../discover/FilterFunnel';
import { UserProfile } from '../types';
import { useTheme } from '../../theme/ThemeContext';

const { width: W } = Dimensions.get('window');

// Coordenadas del usuario (luego reemplazar con expo-location)
const MY_LAT = 2.1532;
const MY_LON = -75.6148;

export default function DiscoverScreen() {
  const { colors, isDark } = useTheme();
  const { profiles, loading, swiping, swipe, refetch, prependProfile } = useDiscover();
  const { completion } = useProfile();
  const { user } = useAuth();
  const { settings, saving, save } = useSettings();
  const router = useRouter();

  // ── Estado de modales ──────────────────────────────────────────────────────
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

  // ── Undo: guardamos el último perfil removido ──────────────────────────────
  const [undoStack, setUndoStack] = useState<UserProfile[]>([]);
  const canUndo = undoStack.length > 0;

  // ── Refrescar al ganar foco ────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      refetch();
      setUndoStack([]); // limpiamos el stack al entrar de nuevo
    }, [refetch])
  );

  // ── Completion prompt ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (completion.percentage < 100 && !hasShownPrompt && !loading) {
      const timer = setTimeout(() => {
        setShowCompletionPrompt(true);
        setHasShownPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [completion.percentage, loading, hasShownPrompt]);

  // ── Swipe handler ──────────────────────────────────────────────────────────
  const handleSwipe = async (
    userId: string,
    direction: 'like' | 'dislike',
    name: string,
    profile: UserProfile,
  ) => {
    // Guardamos en undo stack antes de remover (solo los últimos 3 perfiles)
    setUndoStack(prev => [profile, ...prev].slice(0, 3));

    const result = await swipe(userId, direction);
    if (result?.esMatch && direction === 'like') {
      setMatchData({
        name,
        userId,
        matchId: result.matchId ?? '',
        photo:   profile.profile_picture
                   ? (typeof profile.profile_picture === 'object' ? profile.profile_picture.url : profile.profile_picture)
                   : '',
      });
      setShowMatch(true);
    }
  };

  // ── Undo: devuelve el último perfil al frente de la lista ────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const [last, ...rest] = undoStack;
    setUndoStack(rest);
    prependProfile(last);
  }, [undoStack, prependProfile]);

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.textLight }]}>Buscando personas cerca de ti...</Text>
      </View>
    );
  }

  const topProfile = profiles[0] ?? null;

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={s.safe}>

        {/* ── Header Premium ── */}
        <View style={s.header}>
          <View style={s.logoWrapper}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.logoDot}
            />
            <Text style={[s.logoText, { color: colors.text }]}>Debuta</Text>
          </View>

          {/* Chip de filtros rápidos */}
          <FilterFunnel
            settings={settings}
            saving={saving}
            onSave={save}
            onApplied={refetch}
          />
        </View>



        {/* ── Barra de filtros activos ── */}
        <ActiveFilterBar settings={settings} colors={colors} isDark={isDark} />

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

        {/* ── Botones like / dislike / undo ── */}
        {profiles.length > 0 && (
          <View style={s.footer}>
            <ActionButtons
              disabled={swiping}
              canUndo={canUndo}
              onDislike={() => {
                if (topProfile) handleSwipe(topProfile.id, 'dislike', topProfile.first_name || topProfile.username, topProfile);
              }}
              onLike={() => {
                if (topProfile) handleSwipe(topProfile.id, 'like', topProfile.first_name || topProfile.username, topProfile);
              }}
              onUndo={handleUndo}
            />
          </View>
        )}

        {/* ── Modals ── */}
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
          onLike={() => {
            if (previewProfile) {
              handleSwipe(previewProfile.id, 'like', previewProfile.first_name || previewProfile.username, previewProfile);
              setPreviewProfile(null);
            }
          }}
          onPass={() => {
            if (previewProfile) {
              handleSwipe(previewProfile.id, 'dislike', previewProfile.first_name || previewProfile.username, previewProfile);
              setPreviewProfile(null);
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Barra de resumen de filtros activos ─────────────────────────────────────
const LOOKING_FOR_LABELS: Record<string, string> = {
  amistad: '🤝 Amistad', citas: '💑 Citas', serio: '💍 Serio',
  casual: '🌊 Casual', no_lo_se: '🤷 No sé',
};

function ActiveFilterBar({ settings, colors, isDark }: {
  settings: Settings;
  colors: any;
  isDark: boolean;
}) {
  const chips: string[] = [];
  if (settings.max_distance !== 50)
    chips.push(`📍 ≤${settings.max_distance}km`);
  if (settings.min_age !== 18 || settings.max_age !== 40)
    chips.push(`🎂 ${settings.min_age}–${settings.max_age}`);
  if (settings.show_me !== 'ALL')
    chips.push(settings.show_me === 'M' ? '♂ Hombres' : '♀ Mujeres');
  if (settings.looking_for && settings.looking_for !== 'ALL')
    chips.push(LOOKING_FOR_LABELS[settings.looking_for] ?? settings.looking_for);
  if (settings.interests_filter && settings.interests_filter.length > 0)
    chips.push(`✨ ${settings.interests_filter.length} interés${settings.interests_filter.length > 1 ? 'es' : ''}`);
  if (settings.verified_only)  chips.push('✅ Verificados');
  if (settings.has_bio_only)   chips.push('📝 Con bio');
  if (settings.min_photos > 0) chips.push(`📸 ≥${settings.min_photos} foto${settings.min_photos > 1 ? 's' : ''}`);

  if (chips.length === 0) return null;

  const bg    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const textC = isDark ? 'rgba(255,255,255,0.7)'  : 'rgba(0,0,0,0.58)';

  return (
    <View style={ab.row}>
      {chips.map((c, i) => (
        <View key={i} style={[ab.chip, { backgroundColor: bg }]}>
          <Text style={[ab.text, { color: textC }]}>{c}</Text>
        </View>
      ))}
    </View>
  );
}

const ab = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4, flexWrap: 'wrap', gap: 5 },
  chip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15 },
  loadingText: { fontSize: 14, fontWeight: '600' },
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
  logoText: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  footer: {
    paddingBottom: 20,
    paddingTop: 6,
  },

});