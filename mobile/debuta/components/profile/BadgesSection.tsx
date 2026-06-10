import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';
import {
  Award, Heart, Crown, Star, Flame, Calendar,
  MessageCircle, Gem, Lock, Trophy, CheckCircle,
} from 'lucide-react-native';

interface BadgesDef {
  id:       string;
  Icon:     React.ComponentType<any>;
  title:    string;
  desc:     string;
  unlocked: boolean;
}

interface Props {
  matchCount:         number;
  profileCompletion:  number;
  hasConfirmedDate:   boolean;
  createdAt?:         string;
}

const STORAGE_KEYS = {
  messagesSent: 'gamification_messages_sent',
  bestStreak:   'gamification_best_streak',
};

export async function incrementMessagesSent() {
  const cur = Number(await AsyncStorage.getItem(STORAGE_KEYS.messagesSent) ?? '0');
  await AsyncStorage.setItem(STORAGE_KEYS.messagesSent, String(cur + 1));
}

export async function updateBestStreak(streak: number) {
  const cur = Number(await AsyncStorage.getItem(STORAGE_KEYS.bestStreak) ?? '0');
  if (streak > cur) {
    await AsyncStorage.setItem(STORAGE_KEYS.bestStreak, String(streak));
  }
}

// ── Badge individual ──────────────────────────────────────────────────────────
function Badge({ badge, onPress }: { badge: BadgesDef; onPress: () => void }) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

  useEffect(() => {
    if (!badge.unlocked) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseScale, { toValue: 1.07, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseScale, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [badge.unlocked]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={b.wrap}>
      <Animated.View style={[
        b.circle,
        badge.unlocked
          ? { backgroundColor: colors.primary + '22', borderColor: colors.primary + '60' }
          : { backgroundColor: colors.card,           borderColor: colors.glassBorder },
        badge.unlocked && { transform: [{ scale: pulseScale }] },
      ]}>
        <badge.Icon
          size={26}
          color={badge.unlocked ? colors.primary : colors.textDim}
          strokeWidth={badge.unlocked ? 2 : 1.5}
        />
      </Animated.View>
      <Text style={[b.title, { color: badge.unlocked ? colors.text : colors.textDim }]} numberOfLines={2}>
        {badge.title}
      </Text>
      {!badge.unlocked && (
        <Lock size={10} color={colors.textDim} />
      )}
    </TouchableOpacity>
  );
}

// ── BadgesSection ─────────────────────────────────────────────────────────────
export default function BadgesSection({
  matchCount, profileCompletion, hasConfirmedDate, createdAt,
}: Props) {
  const { colors, isDark } = useTheme();
  const [messagesSent, setMessagesSent] = useState(0);
  const [bestStreak,   setBestStreak]   = useState(0);
  const [selected,     setSelected]     = useState<BadgesDef | null>(null);

  useEffect(() => {
    (async () => {
      setMessagesSent(Number(await AsyncStorage.getItem(STORAGE_KEYS.messagesSent) ?? '0'));
      setBestStreak(Number(await AsyncStorage.getItem(STORAGE_KEYS.bestStreak) ?? '0'));
    })();
  }, []);

  const daysActive = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
    : 0;

  const badges: BadgesDef[] = [
    {
      id:       'debutante',
      Icon:     Award,
      title:    'Debutante',
      desc:     'Creaste tu perfil en Debuta. ¡Bienvenido!',
      unlocked: true,
    },
    {
      id:       'primer_match',
      Icon:     Heart,
      title:    'Primer Match',
      desc:     'Conseguiste tu primer match. ¡El comienzo de algo especial!',
      unlocked: matchCount >= 1,
    },
    {
      id:       'popular',
      Icon:     Crown,
      title:    'Popular',
      desc:     'Tienes 10 o más matches. ¡Eres todo un éxito!',
      unlocked: matchCount >= 10,
    },
    {
      id:       'estrella',
      Icon:     Star,
      title:    'Perfil Estelar',
      desc:     'Completaste tu perfil al 100%. ¡La primera impresión importa!',
      unlocked: profileCompletion >= 100,
    },
    {
      id:       'en_llamas',
      Icon:     Flame,
      title:    'En Llamas',
      desc:     'Mantuviste una racha de 7 días seguidos chateando.',
      unlocked: bestStreak >= 7,
    },
    {
      id:       'cita',
      Icon:     Calendar,
      title:    'Primera Cita',
      desc:     'Confirmaste tu primera cita a través de Debuta. ¡Suerte!',
      unlocked: hasConfirmedDate,
    },
    {
      id:       'conversador',
      Icon:     MessageCircle,
      title:    'Conversador',
      desc:     'Enviaste 50 mensajes. ¡La conversación fluye contigo!',
      unlocked: messagesSent >= 50,
    },
    {
      id:       'leal',
      Icon:     Gem,
      title:    'Leal',
      desc:     'Llevas más de 30 días siendo parte de la comunidad Debuta.',
      unlocked: daysActive >= 30,
    },
  ];

  const unlocked = badges.filter(b => b.unlocked).length;

  return (
    <View style={[bs.root, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
      <View style={bs.header}>
        <View style={bs.titleRow}>
          <Trophy size={16} color={colors.primary} />
          <Text style={[bs.title, { color: colors.text }]}>Logros</Text>
        </View>
        <Text style={[bs.subtitle, { color: colors.textDim }]}>
          {unlocked}/{badges.length} desbloqueados
        </Text>
      </View>

      {/* Barra de progreso de logros */}
      <View style={[bs.progressBg, { backgroundColor: colors.glassBorder }]}>
        <Animated.View style={[bs.progressFill, {
          backgroundColor: colors.primary,
          width: `${(unlocked / badges.length) * 100}%`,
        }]} />
      </View>

      <View style={bs.grid}>
        {badges.map(badge => (
          <Badge key={badge.id} badge={badge} onPress={() => setSelected(badge)} />
        ))}
      </View>

      {/* Modal detalle del logro */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={bs.modalOverlay} onPress={() => setSelected(null)} activeOpacity={1}>
          <View style={[bs.modalCard, { backgroundColor: isDark ? '#1a1040' : '#fff' }]}>
            {selected && (
              <View style={[bs.modalIconWrap, { backgroundColor: selected.unlocked ? colors.primary + '22' : colors.glassBorder }]}>
                <selected.Icon size={40} color={selected.unlocked ? colors.primary : colors.textDim} />
              </View>
            )}
            <Text style={[bs.modalTitle, { color: colors.text }]}>{selected?.title}</Text>
            <Text style={[bs.modalDesc, { color: colors.textDim }]}>{selected?.desc}</Text>
            <View style={[bs.modalStatus, {
              backgroundColor: selected?.unlocked ? '#10B98120' : colors.glassBorder,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {selected?.unlocked
                  ? <CheckCircle size={14} color="#10B981" />
                  : <Lock size={14} color={colors.textDim} />
                }
                <Text style={{ color: selected?.unlocked ? '#10B981' : colors.textDim, fontWeight: '700', fontSize: 13 }}>
                  {selected?.unlocked ? 'Desbloqueado' : 'Pendiente'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const b = StyleSheet.create({
  wrap:       { alignItems: 'center', width: '25%', paddingHorizontal: 4, marginBottom: 18 },
  circle: {
    width:        58,
    height:       58,
    borderRadius: 29,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  1.5,
    marginBottom: 6,
  },
  title:      { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
});

const bs = StyleSheet.create({
  root: {
    borderRadius:  20,
    borderWidth:   1,
    padding:       18,
    marginTop:     16,
    marginHorizontal: 16,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title:    { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 12, fontWeight: '600' },
  progressBg: {
    height:       6,
    borderRadius: 3,
    marginBottom: 18,
    overflow:     'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  modalCard: {
    width:         '78%',
    borderRadius:  24,
    padding:       28,
    alignItems:    'center',
  },
  modalIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle:  { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalDesc:   { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  modalStatus: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
});
