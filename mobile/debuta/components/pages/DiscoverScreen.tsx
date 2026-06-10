// DiscoverScreen.tsx - Rediseño Premium con Filtros y Undo
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated,
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
import { UserProfile, Afinidad } from '../types';
import { useTheme } from '../../theme/ThemeContext';
import { MapPin, Cake, Users, Sparkles, CheckCircle, FileText, Camera, Heart } from 'lucide-react-native';

const { width: W } = Dimensions.get('window');

// Coordenadas del usuario (luego reemplazar con expo-location)
const MY_LAT = 2.1532;
const MY_LON = -75.6148;

export default function DiscoverScreen() {
  const { colors, isDark } = useTheme();
  const { profiles, loading, swiping, swipe, refetch, prependProfile, superlikeAvailable, superlikeDaysLeft } = useDiscover();
  const { completion } = useProfile();
  const { user } = useAuth();
  const { settings, saving, save } = useSettings();
  const router = useRouter();

  // ── Estado de modales ──────────────────────────────────────────────────────
  const [matchData, setMatchData] = useState<{
    name:     string;
    userId:   string;
    matchId:  string;
    photo:    string;
    afinidad: Afinidad | null;
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
    direction: 'like' | 'dislike' | 'superlike',
    name: string,
    profile: UserProfile,
  ) => {
    // Guardamos en undo stack antes de remover (solo los últimos 3 perfiles)
    setUndoStack(prev => [profile, ...prev].slice(0, 3));

    const result = await swipe(userId, direction);
    if (result?.esMatch && (direction === 'like' || direction === 'superlike')) {
      setMatchData({
        name,
        userId,
        matchId:  result.matchId ?? '',
        photo:    profile.profile_picture
                    ? (typeof profile.profile_picture === 'object' ? profile.profile_picture.url : profile.profile_picture)
                    : '',
        afinidad: profile.afinidad ?? null,
      });
      setShowMatch(true);
    }
  };

  // ── Super Like: usa endpoint dedicado con cooldown de 7 días ────────────
  const handleSuperLike = () => {
    if (topProfile && superlikeAvailable) {
      handleSwipe(topProfile.id, 'superlike', topProfile.first_name || topProfile.username, topProfile);
    }
  };

  // ── Undo: devuelve el último perfil al frente de la lista ────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const [last, ...rest] = undoStack;
    setUndoStack(rest);
    prependProfile(last);
  }, [undoStack, prependProfile]);

  // ── Loading screen animado ─────────────────────────────────────────────────
  if (loading) {
    return <AnimatedLoadingScreen colors={colors} />;
  }

  const topProfile = profiles[0] ?? null;

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AmbientParticles colors={colors} />
      <SafeAreaView style={s.safe}>

        {/* ── Header Premium ── */}
        <View style={s.header}>
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
                stackIndex={index}
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
              superlikeAvailable={superlikeAvailable}
              superlikeDaysLeft={superlikeDaysLeft}
              onDislike={() => {
                if (topProfile) handleSwipe(topProfile.id, 'dislike', topProfile.first_name || topProfile.username, topProfile);
              }}
              onLike={() => {
                if (topProfile) handleSwipe(topProfile.id, 'like', topProfile.first_name || topProfile.username, topProfile);
              }}
              onSuperLike={handleSuperLike}
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
          afinidad={matchData?.afinidad}
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
  amistad: 'Amistad', citas: 'Citas', serio: 'Serio',
  casual: 'Casual', no_lo_se: 'No sé',
};

type ChipItem = { Icon: React.ComponentType<any>; label: string };

function ActiveFilterBar({ settings, colors, isDark }: {
  settings: Settings;
  colors: any;
  isDark: boolean;
}) {
  const chips: ChipItem[] = [];
  if (settings.max_distance !== 50)
    chips.push({ Icon: MapPin, label: `≤${settings.max_distance}km` });
  if (settings.min_age !== 18 || settings.max_age !== 40)
    chips.push({ Icon: Cake, label: `${settings.min_age}–${settings.max_age}` });
  if (settings.show_me !== 'ALL')
    chips.push({ Icon: Users, label: settings.show_me === 'M' ? 'Hombres' : 'Mujeres' });
  if (settings.looking_for && settings.looking_for !== 'ALL')
    chips.push({ Icon: Heart, label: LOOKING_FOR_LABELS[settings.looking_for] ?? settings.looking_for });
  if (settings.interests_filter && settings.interests_filter.length > 0)
    chips.push({ Icon: Sparkles, label: `${settings.interests_filter.length} interés${settings.interests_filter.length > 1 ? 'es' : ''}` });
  if (settings.verified_only)  chips.push({ Icon: CheckCircle, label: 'Verificados' });
  if (settings.has_bio_only)   chips.push({ Icon: FileText,    label: 'Con bio' });
  if (settings.min_photos > 0) chips.push({ Icon: Camera,      label: `≥${settings.min_photos} foto${settings.min_photos > 1 ? 's' : ''}` });

  if (chips.length === 0) return null;

  const bg    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const textC = isDark ? 'rgba(255,255,255,0.7)'  : 'rgba(0,0,0,0.58)';

  return (
    <View style={ab.row}>
      {chips.map(({ Icon, label }, i) => (
        <View key={i} style={[ab.chip, { backgroundColor: bg }]}>
          <Icon size={11} color={textC} />
          <Text style={[ab.text, { color: textC }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const ab = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4, flexWrap: 'wrap', gap: 5 },
  chip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── Partículas flotantes de ambiente ────────────────────────────────────────
const { height: H } = Dimensions.get('window');

function FloatingDot({ left, top, size, delay, duration, color }: {
  left: number; top: number; size: number; delay: number; duration: number; color: string;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.42, duration: duration * 0.25, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.08, duration: duration * 0.50, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,    duration: duration * 0.25, useNativeDriver: true }),
          ]),
          Animated.timing(translateY, { toValue: -85, duration, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:        'absolute',
        left, top,
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: color,
        opacity,
        transform:       [{ translateY }],
      }}
    />
  );
}

function AmbientParticles({ colors }: { colors: any }) {
  const dots = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      left:     Math.random() * W,
      top:      Math.random() * H * 0.62,
      size:     1.4 + Math.random() * 2.2,
      delay:    i * 520,
      duration: 7500 + Math.random() * 6000,
      color:    i % 3 === 0 ? colors.secondary : colors.primary,
    }))
  ).current;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {dots.map((d, i) => <FloatingDot key={i} {...d} />)}
    </View>
  );
}

// ─── Loading animado ─────────────────────────────────────────────────────────
function AnimatedLoadingScreen({ colors }: { colors: any }) {
  const pulse     = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOp    = useRef(new Animated.Value(0.6)).current;
  const dotsOp    = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    // Pulso del logo
    const logoLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse,     { toValue: 1.14, duration: 850, useNativeDriver: true }),
      Animated.timing(pulse,     { toValue: 1,    duration: 850, useNativeDriver: true }),
    ]));
    // Anillo externo
    const ringLoop = Animated.loop(Animated.parallel([
      Animated.timing(ringScale, { toValue: 1.5,  duration: 1400, useNativeDriver: true }),
      Animated.timing(ringOp,    { toValue: 0,    duration: 1400, useNativeDriver: true }),
    ]));
    // Dots pulsantes
    const dotLoops = dotsOp.map((op, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 200),
        Animated.timing(op, { toValue: 1,   duration: 400, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]))
    );
    logoLoop.start();
    ringLoop.start();
    dotLoops.forEach(l => l.start());
    return () => { logoLoop.stop(); ringLoop.stop(); dotLoops.forEach(l => l.stop()); };
  }, []);

  return (
    <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
      <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        {/* Anillo exterior pulsante */}
        <Animated.View style={[
          ls.ring,
          { borderColor: colors.primary, transform: [{ scale: ringScale }], opacity: ringOp },
        ]} />
        {/* Logo central */}
        <Animated.View style={[ls.logoCircle, { backgroundColor: colors.primary, transform: [{ scale: pulse }] }]}>
          <Text style={ls.logoLetter}>D</Text>
        </Animated.View>
      </View>
      <Text style={[ls.loadingLabel, { color: colors.textLight }]}>
        Buscando personas cerca de ti
      </Text>
      {/* Tres puntos animados */}
      <View style={ls.dotsRow}>
        {dotsOp.map((op, i) => (
          <Animated.View key={i} style={[ls.dot, { backgroundColor: colors.primary, opacity: op }]} />
        ))}
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  ring: {
    position:     'absolute',
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  2,
  },
  logoCircle: {
    width:          68,
    height:         68,
    borderRadius:   34,
    alignItems:     'center',
    justifyContent: 'center',
  },
  logoLetter: { fontSize: 34, fontWeight: '900', color: '#fff' },
  loadingLabel: { fontSize: 15, fontWeight: '600', marginBottom: 14 },
  dotsRow:   { flexDirection: 'row', gap: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 8, height: 8, borderRadius: 4 },
  logoText: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 16,
    paddingTop: 4,
  },

});