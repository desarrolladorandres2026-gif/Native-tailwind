import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onDislike: () => void;
  onLike:    () => void;
  disabled:  boolean;
}

const ActionButtons: React.FC<Props> = ({ onDislike, onLike, disabled }) => {
  return (
    <View style={s.row}>
      <TouchableOpacity
        style={s.btn}
        onPress={onDislike}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={32} color="#8E8E93" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btn, { borderColor: 'rgba(255, 45, 85, 0.2)' }]}
        onPress={onLike}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="heart" size={30} color="#FF2D55" />
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            30,
    paddingVertical: 20,
  },
  btn: {
    width:           70,
    height:          70,
    borderRadius:    35,
    backgroundColor: '#FFFFFF',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     '#F2F2F7',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 10 },
    shadowOpacity:   0.1,
    shadowRadius:    15,
    elevation:       5,
  },
});

export default ActionButtons;
