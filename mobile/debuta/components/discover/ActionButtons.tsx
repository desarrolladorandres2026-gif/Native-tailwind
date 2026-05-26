import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  onDislike:   () => void;
  onLike:      () => void;
  onUndo?:     () => void;
  disabled:    boolean;
  canUndo?:    boolean;
}

const ActionButtons: React.FC<Props> = ({ onDislike, onLike, onUndo, disabled, canUndo }) => {
  const { colors } = useTheme();

  return (
    <View style={s.row}>
      {/* Dislike */}
      <TouchableOpacity
        style={[s.btn, s.btnMd, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
        onPress={onDislike}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={28} color={colors.textLight} />
      </TouchableOpacity>

      {/* Like (grande, central) */}
      <TouchableOpacity
        style={[s.btn, s.btnLg, { backgroundColor: colors.card, borderColor: `${colors.primary}40` }]}
        onPress={onLike}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="heart" size={34} color={colors.primary} />
      </TouchableOpacity>

      {/* Undo/Rewind */}
      <TouchableOpacity
        style={[
          s.btn, s.btnMd,
          { backgroundColor: colors.card, borderColor: canUndo ? `${colors.secondary}60` : colors.glassBorder },
          !canUndo && s.btnDisabled,
        ]}
        onPress={onUndo}
        disabled={disabled || !canUndo}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-undo"
          size={22}
          color={canUndo ? colors.secondary : colors.textLight}
        />
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            18,
    paddingVertical: 14,
  },
  btn: {
    borderRadius:   35,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 8 },
    shadowOpacity:  0.1,
    shadowRadius:   12,
    elevation:      5,
  },
  btnLg: { width: 72, height: 72 },
  btnMd: { width: 58, height: 58 },
  btnDisabled: { opacity: 0.4 },
});

export default ActionButtons;
