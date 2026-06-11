import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Zap, MessageCircle } from 'lucide-react-native';
import { Afinidad } from '../types';
import { boxShadow } from '../utils/shadow';

const { width: W, height: H } = Dimensions.get('window');

// ── Pieza de confeti ──────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#FF6B6B','#FFD700','#7C3AED','#EC4899','#10B981',
  '#F59E0B','#06B6D4','#EF4444','#8B5CF6','#34D399',
];

function ConfettiPiece({ startX, color, delay, size, tall }: {
  startX: number; color: string; delay: number; size: number; tall: boolean;
}) {
  const y       = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate  = useRef(new Animated.Value(0)).current;
  const sway    = useRef(new Animated.Value(0)).current;

  const duration   = 1900 + Math.random() * 1100;
  const swayAmt    = 22 + Math.random() * 38;
  const swayDur    = 500 + Math.random() * 400;
  const rotations  = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4);

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, { toValue: H + 60, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 80,            useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: duration - 380, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300,           useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: rotations, duration, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(sway, { toValue: swayAmt,  duration: swayDur, useNativeDriver: true }),
          Animated.timing(sway, { toValue: -swayAmt, duration: swayDur, useNativeDriver: true }),
        ])),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const rotateDeg = rotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{
      position:        'absolute',
      left:            startX,
      top:             0,
      width:           size,
      height:          tall ? size * 1.7 : size,
      backgroundColor: color,
      borderRadius:    tall ? 2 : size / 2,
      transform:       [{ translateY: y }, { translateX: sway }, { rotate: rotateDeg }],
      opacity,
    }} />
  );
}

const ICEBREAKERS = [
  '¿Cuál es el mejor lugar que has visitado?',
  '¿Si pudieras cenar con alguien famoso, quién sería?',
  '¿Cuál es tu canción favorita en este momento?',
  '¿Playa o montaña?',
  '¿Qué harías en un día libre perfecto?',
  '¿Tienes algún hobbie secreto?',
  '¿Prefieres amanecer o atardecer?',
  '¿Qué serie estás viendo últimamente?',
  '¿Café o té por las mañanas?',
  '¿Cuál es tu comida favorita?',
  '¿Tienes viajes soñados para este año?',
  '¿Qué es lo que más te apasiona en la vida?',
  '¿Libro, película o serie?',
  '¿A qué lugar de Colombia te irías este finde?',
];

const PARTICLE_COLORS = ['#FFD700', '#FF6B6B', '#7C3AED', '#EC4899', '#10B981', '#F59E0B'];

// ── Partícula individual ──────────────────────────────────────────────────────
function Particle({ delay, color }: { delay: number; color: string }) {
  const pos     = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale   = useRef(new Animated.Value(0)).current;

  const angle    = Math.random() * Math.PI * 2;
  const distance = 70 + Math.random() * 130;
  const toX = Math.cos(angle) * distance;
  const toY = Math.sin(angle) * distance;
  const size = 6 + Math.random() * 8;
  const isSquare = Math.random() > 0.5;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(pos, {
          toValue: { x: toX, y: toY },
          duration: 650 + Math.random() * 350,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scale,   { toValue: 1,   duration: 120, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 550, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={{
      position:  'absolute',
      transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale }],
      opacity,
    }}>
      <View style={{
        width:           size,
        height:          size,
        borderRadius:    isSquare ? 2 : size / 2,
        backgroundColor: color,
      }} />
    </Animated.View>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible:        boolean;
  name:           string;
  onClose:        () => void;
  matchId?:       string;
  matchedUserId?: string;
  matchedPhoto?:  string;
  afinidad?:      Afinidad | null;
}

// ── MatchModal ────────────────────────────────────────────────────────────────
const MatchModal: React.FC<Props> = ({
  visible, name, onClose, matchedUserId, matchedPhoto, afinidad,
}) => {
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const barAnim     = useRef(new Animated.Value(0)).current;
  const heartPulse  = useRef(new Animated.Value(1)).current;
  const glowOp      = useRef(new Animated.Value(0)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [particleKey,  setParticleKey]  = useState(0);
  const [confettiKey,  setConfettiKey]  = useState(0);
  const [icebreakers,  setIcebreakers]  = useState<string[]>([]);

  // Generar piezas de confeti una sola vez por render (estables)
  const confettiPieces = useRef(
    Array.from({ length: 34 }).map((_, i) => ({
      startX: Math.random() * W,
      color:  CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay:  i * 55,
      size:   5 + Math.random() * 7,
      tall:   Math.random() > 0.45,
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // New random icebreakers each time
      const shuffled = [...ICEBREAKERS].sort(() => Math.random() - 0.5);
      setIcebreakers(shuffled.slice(0, 3));

      // Trigger new particle + confetti burst
      setParticleKey(k => k + 1);
      setConfettiKey(k => k + 1);

      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();

      // Corazón pulsante
      pulseAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(heartPulse, { toValue: 1.15, duration: 750, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1,    duration: 750, useNativeDriver: true }),
        ])
      );
      pulseAnimRef.current.start();
      Animated.timing(glowOp, { toValue: 1, duration: 500, useNativeDriver: true }).start();

      // Afinidad bar fill
      if (afinidad?.score) {
        barAnim.setValue(0);
        setTimeout(() => {
          Animated.timing(barAnim, {
            toValue:  afinidad.score / 100,
            duration: 900,
            useNativeDriver: false,
          }).start();
        }, 420);
      }
    } else {
      pulseAnimRef.current?.stop();
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      barAnim.setValue(0);
      heartPulse.setValue(1);
      glowOp.setValue(0);
    }
  }, [visible]);

  const goToChat = (icebreaker?: string) => {
    onClose();
    if (matchedUserId) {
      router.push({
        pathname: '/chat/[userId]',
        params: {
          userId:   matchedUserId,
          name,
          photo:    matchedPhoto ?? '',
          ...(icebreaker ? { icebreaker } : {}),
        },
      });
    }
  };

  const particles = Array.from({ length: 18 }).map((_, i) => ({
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    delay: i * 35,
  }));

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[st.overlay, { opacity: opacityAnim }]}>
        <LinearGradient
          colors={['rgba(7,2,20,0.30)', 'rgba(45,27,61,0.90)', 'rgba(7,2,20,0.30)']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* ── Confeti cayendo de pantalla completa ── */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {confettiPieces.map((p, i) => (
            <ConfettiPiece key={`${confettiKey}-${i}`} {...p} />
          ))}
        </View>

        <Animated.View style={[st.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Partículas de celebración */}
          <View style={st.particleOrigin} pointerEvents="none">
            {particles.map((p, i) => (
              <Particle key={`${particleKey}-${i}`} delay={p.delay} color={p.color} />
            ))}
          </View>

          {/* Icono con glow pulsante */}
          <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Animated.View style={[st.glowRingOuter, { opacity: glowOp }]} />
            <Animated.View style={[st.glowRingInner, { opacity: glowOp }]} />
            <Animated.View style={[st.iconCircle, { transform: [{ scale: heartPulse }] }]}>
              <Ionicons name="heart" size={40} color="#e8659a" />
            </Animated.View>
          </View>

          <Text style={st.title}>¡Es un Match!</Text>
          <Text style={st.subtitle}>
            Tú y <Text style={st.nameText}>{name}</Text> se gustaron mutuamente
          </Text>

          {/* Barra de compatibilidad */}
          {afinidad && afinidad.score > 0 && (
            <View style={st.afinidadSection}>
              <View style={st.afinidadHeader}>
                <View style={st.afinidadLabelRow}>
                  <Zap size={13} color="#2d1b3d" fill="#2d1b3d" />
                  <Text style={st.afinidadLabel}>Compatibilidad</Text>
                </View>
                <Text style={st.afinidadScore}>{afinidad.score}%</Text>
              </View>
              <View style={st.barBg}>
                <Animated.View style={[
                  st.barFill,
                  { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}>
                  <LinearGradient
                    colors={['#e8659a', '#D946EF', '#8B5CF6']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </Animated.View>
              </View>
              {afinidad.resumen ? (
                <Text style={st.afinidadResumen}>{afinidad.resumen}</Text>
              ) : null}
            </View>
          )}

          {/* Icebreakers */}
          <View style={st.icebreakerSection}>
            <View style={st.icebreakerTitleRow}>
              <MessageCircle size={13} color="#2d1b3d" />
              <Text style={st.icebreakerTitle}>Rompe el hielo</Text>
            </View>
            {icebreakers.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={st.icebreakerBtn}
                onPress={() => goToChat(q)}
                activeOpacity={0.72}
              >
                <Text style={st.icebreakerText}>{q}</Text>
                <Ionicons name="send" size={13} color="rgba(232,101,154,0.7)" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => goToChat()} activeOpacity={0.7}>
              <Text style={st.directChat}>o chatear directamente →</Text>
            </TouchableOpacity>
          </View>

          {/* Cerrar */}
          <TouchableOpacity style={st.btnSecondary} onPress={onClose} activeOpacity={0.85}>
            <Text style={st.btnSecondaryText}>Seguir explorando</Text>
          </TouchableOpacity>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const st = StyleSheet.create({
  overlay: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  card: {
    width:           W * 0.88,
    backgroundColor: '#FFF4FA',
    borderRadius:    26,
    padding:         26,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     'rgba(232,101,154,0.38)',
    boxShadow:       boxShadow('#e8659a', 16, 30, 0.38),
  },
  glowRingOuter: {
    position:     'absolute',
    width:        110,
    height:       110,
    borderRadius: 55,
    borderWidth:  1.5,
    borderColor:  'rgba(232,101,154,0.22)',
  },
  glowRingInner: {
    position:     'absolute',
    width:        92,
    height:       92,
    borderRadius: 46,
    borderWidth:  2,
    borderColor:  'rgba(232,101,154,0.42)',
  },
  particleOrigin: {
    position:       'absolute',
    top:            '28%',
    left:           '50%',
    width:          0,
    height:         0,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         20,
  },
  iconCircle: {
    width:           76,
    height:          76,
    borderRadius:    38,
    backgroundColor: 'rgba(232,101,154,0.14)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     'rgba(232,101,154,0.38)',
    boxShadow:       boxShadow('#e8659a', 0, 18, 0.45),
  },
  title: {
    color:        '#2d1b3d',
    fontSize:     26,
    fontWeight:   '800',
    marginBottom: 7,
  },
  subtitle: {
    color:        'rgba(45,27,61,0.56)',
    fontSize:     14,
    textAlign:    'center',
    lineHeight:   20,
    marginBottom: 18,
  },
  nameText: { color: '#e8659a', fontWeight: '700' },

  // Afinidad
  afinidadSection: { width: '100%', marginBottom: 18 },
  afinidadHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },
  afinidadLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  afinidadLabel:   { fontSize: 13, fontWeight: '700', color: '#2d1b3d' },
  afinidadScore:   { fontSize: 15, fontWeight: '900', color: '#e8659a' },
  barBg: {
    width:        '100%',
    height:       8,
    borderRadius: 4,
    backgroundColor: 'rgba(232,101,154,0.15)',
    overflow:     'hidden',
  },
  barFill: {
    height:       '100%',
    borderRadius: 4,
    overflow:     'hidden',
  },
  afinidadResumen: {
    fontSize:   11,
    color:      'rgba(45,27,61,0.48)',
    marginTop:  6,
    textAlign:  'center',
  },

  // Icebreakers
  icebreakerSection: { width: '100%', marginBottom: 16 },
  icebreakerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  icebreakerTitle: {
    fontSize:  13,
    fontWeight: '700',
    color:     '#2d1b3d',
  },
  icebreakerBtn: {
    backgroundColor:  'rgba(232,101,154,0.08)',
    borderRadius:     12,
    paddingHorizontal: 14,
    paddingVertical:  10,
    marginBottom:     7,
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    borderWidth:      1,
    borderColor:      'rgba(232,101,154,0.20)',
  },
  icebreakerText: {
    color:       '#2d1b3d',
    fontSize:    13,
    fontWeight:  '500',
    flex:        1,
    marginRight: 8,
    lineHeight:  18,
  },
  directChat: {
    textAlign:  'center',
    color:      'rgba(232,101,154,0.65)',
    fontSize:   12,
    fontWeight: '600',
    marginTop:  4,
  },

  // Cerrar
  btnSecondary: {
    width:           '100%',
    borderRadius:    14,
    paddingVertical: 13,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     'rgba(45,27,61,0.13)',
  },
  btnSecondaryText: { color: 'rgba(45,27,61,0.55)', fontSize: 15 },
});

export default MatchModal;
