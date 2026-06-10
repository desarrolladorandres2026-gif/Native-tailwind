import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  onDislike:           () => void;
  onLike:              () => void;
  onSuperLike?:        () => void;
  onUndo?:             () => void;
  disabled:            boolean;
  canUndo?:            boolean;
  superlikeAvailable?: boolean;
  superlikeDaysLeft?:  number;
}

const ActionButtons: React.FC<Props> = ({
  onDislike, onLike, onSuperLike, onUndo, disabled, canUndo,
  superlikeAvailable = true, superlikeDaysLeft = 0,
}) => {
  const { colors, isDark } = useTheme();
  const superScale   = useRef(new Animated.Value(1)).current;
  const likeScale    = useRef(new Animated.Value(1)).current;
  const dislikeScale = useRef(new Animated.Value(1)).current;

  const pulse = (anim: Animated.Value, intensity = 1.2) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: intensity, useNativeDriver: true, speed: 60, bounciness: 14 }),
      Animated.spring(anim, { toValue: 1,         useNativeDriver: true, speed: 40 }),
    ]).start();
  };

  const handleDislike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pulse(dislikeScale, 1.16);
    onDislike();
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pulse(likeScale, 1.22);
    onLike();
  };

  const handleSuperLike = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    pulse(superScale, 1.42);
    onSuperLike?.();
  };

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUndo?.();
  };

  return (
    <View style={s.row}>
      {/* Undo */}
      <TouchableOpacity
        style={[
          s.btn, s.btnSm,
          { backgroundColor: colors.card, borderColor: canUndo ? `${colors.secondary}60` : colors.glassBorder },
          !canUndo && s.btnDisabled,
        ]}
        onPress={handleUndo}
        disabled={disabled || !canUndo}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-undo"
          size={20}
          color={canUndo ? colors.secondary : colors.textLight}
        />
      </TouchableOpacity>

      {/* Dislike */}
      <Animated.View style={{ transform: [{ scale: dislikeScale }] }}>
        <TouchableOpacity
          style={[s.btn, s.btnMd, s.dislikeBtn, { backgroundColor: colors.card }]}
          onPress={handleDislike}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={30} color="#FF5864" />
        </TouchableOpacity>
      </Animated.View>

      {/* Like — gradiente premium */}
      <Animated.View style={{ transform: [{ scale: likeScale }] }}>
        <TouchableOpacity
          style={[s.btn, s.btnLg, s.likeBtn]}
          onPress={handleLike}
          disabled={disabled}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 36 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="heart" size={34} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Super Like */}
      <Animated.View style={{ transform: [{ scale: superScale }] }}>
        <TouchableOpacity
          style={[
            s.btn, s.btnMd, s.superBtn,
            !superlikeAvailable && s.superBtnDisabled,
          ]}
          onPress={handleSuperLike}
          disabled={disabled || !superlikeAvailable}
          activeOpacity={0.8}
        >
          <Ionicons
            name={superlikeAvailable ? 'star' : 'lock-closed'}
            size={superlikeAvailable ? 24 : 20}
            color={superlikeAvailable ? '#FFD700' : 'rgba(255,215,0,0.35)'}
          />
          {!superlikeAvailable && superlikeDaysLeft > 0 && (
            <Text style={s.daysLabel}>{superlikeDaysLeft}d</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection:   'row',
    justifyContent:  'center',
    alignItems:      'center',
    gap:             14,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  btn: {
    borderRadius:   36,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
  },
  btnLg: { width: 72, height: 72 },
  btnMd: { width: 58, height: 58 },
  btnSm: { width: 48, height: 48 },
  likeBtn: {
    overflow:      'hidden',
    borderWidth:   0,
    shadowColor:   '#D946EF',
    shadowOffset:  { width: 0, height: 14 },
    shadowOpacity: 0.72,
    shadowRadius:  28,
    elevation:     18,
  },
  dislikeBtn: {
    borderColor:   'rgba(255,88,100,0.30)',
    shadowColor:   '#FF5864',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius:  14,
    elevation:     6,
  },
  superBtn: {
    backgroundColor: 'rgba(255,215,0,0.13)',
    borderColor:     'rgba(255,215,0,0.55)',
  },
  superBtnDisabled: {
    backgroundColor: 'rgba(255,215,0,0.04)',
    borderColor:     'rgba(255,215,0,0.18)',
  },
  daysLabel: {
    position:   'absolute',
    bottom:     4,
    fontSize:   9,
    fontWeight: '700',
    color:      'rgba(255,215,0,0.5)',
    letterSpacing: 0.3,
  },
  btnDisabled: { opacity: 0.4 },
});

export default ActionButtons;
