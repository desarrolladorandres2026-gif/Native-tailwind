import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

interface Props { onRefresh: () => void; }

const EmptyState: React.FC<Props> = ({ onRefresh }) => {
  const { colors } = useTheme();
  const pulse   = useRef(new Animated.Value(1)).current;
  const floatY  = useRef(new Animated.Value(0)).current;
  const enterOp = useRef(new Animated.Value(0)).current;
  const enterY  = useRef(new Animated.Value(28)).current;
  const ringOp  = useRef(new Animated.Value(0.5)).current;
  const ringS   = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterOp, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(enterY,  { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse,  { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse,  { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -9, duration: 1900, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,  duration: 1900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.timing(ringOp, { toValue: 0,   duration: 1600, useNativeDriver: true }),
        Animated.timing(ringS,  { toValue: 1.8, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[st.container, { opacity: enterOp, transform: [{ translateY: enterY }] }]}>

      <Animated.View style={[st.iconWrap, { transform: [{ scale: pulse }, { translateY: floatY }] }]}>
        <Animated.View style={[st.ringPulse, {
          borderColor: colors.primary,
          opacity: ringOp,
          transform: [{ scale: ringS }],
        }]} />
        <LinearGradient
          colors={[`${colors.primary}22`, `${colors.secondary}18`]}
          style={st.iconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Ionicons name="heart-dislike-outline" size={52} color={colors.primary} />
      </Animated.View>

      <Text style={[st.title, { color: colors.text }]}>Sin más perfiles</Text>
      <Text style={[st.subtitle, { color: colors.textDim }]}>
        Vuelve más tarde o amplía tus filtros para ver más personas cerca de ti.
      </Text>

      <TouchableOpacity onPress={onRefresh} activeOpacity={0.82}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={st.btn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={st.btnText}>Actualizar</Text>
        </LinearGradient>
      </TouchableOpacity>

    </Animated.View>
  );
};

const st = StyleSheet.create({
  container: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 38,
    gap:               14,
  },
  iconWrap: {
    width:          112,
    height:         112,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   8,
  },
  ringPulse: {
    position:     'absolute',
    width:        112,
    height:       112,
    borderRadius: 56,
    borderWidth:  2,
  },
  iconBg: {
    position:     'absolute',
    width:        112,
    height:       112,
    borderRadius: 56,
  },
  title: {
    fontSize:      22,
    fontWeight:    '800',
    letterSpacing: -0.3,
    marginTop:     8,
  },
  subtitle: {
    fontSize:   15,
    textAlign:  'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  btn: {
    marginTop:         10,
    paddingHorizontal: 34,
    paddingVertical:   14,
    borderRadius:      26,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    shadowColor:       '#8B5CF6',
    shadowOffset:      { width: 0, height: 7 },
    shadowOpacity:     0.42,
    shadowRadius:      16,
    elevation:         9,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default EmptyState;
