import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { boxShadow } from '../utils/shadow';

const { width } = Dimensions.get('window');

interface Props {
  visible:          boolean;
  superlikeDaysLeft?: number;
  onConfirm:        () => void;
  onClose:          () => void;
}

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'eye',           text: 'Tu perfil aparece destacado en su lista' },
  { icon: 'notifications', text: 'La persona recibe un aviso de tu interés' },
  { icon: 'flash',         text: 'Triplica tus probabilidades de hacer match' },
];

export default function SuperLikeInfoModal({ visible, superlikeDaysLeft = 0, onConfirm, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.content, { backgroundColor: colors.card, borderColor: 'rgba(255,215,0,0.45)' }]}>
          {/* Icono estrella con halo dorado */}
          <View style={s.iconHalo}>
            <LinearGradient
              colors={['rgba(255,215,0,0.30)', 'rgba(255,215,0,0.05)']}
              style={s.iconCircle}
            >
              <Ionicons name="star" size={42} color="#FFD700" />
            </LinearGradient>
          </View>

          <Text style={[s.title, { color: colors.text }]}>¿Qué es un Super Like?</Text>
          <Text style={[s.description, { color: colors.textDim }]}>
            Es la forma de demostrar que alguien te interesa de verdad, antes incluso de hacer match.
          </Text>

          {/* Beneficios */}
          <View style={s.benefits}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <View style={s.benefitIcon}>
                  <Ionicons name={b.icon} size={16} color="#FFD700" />
                </View>
                <Text style={[s.benefitText, { color: colors.textDim }]}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Aviso del cooldown */}
          <View style={s.note}>
            <Ionicons name="time-outline" size={14} color="rgba(255,215,0,0.85)" />
            <Text style={s.noteText}>Tienes 1 Super Like gratis cada 7 días</Text>
          </View>

          {/* Confirmar */}
          <TouchableOpacity style={s.btnPrimary} activeOpacity={0.85} onPress={onConfirm}>
            <Ionicons name="star" size={18} color="#1A1300" />
            <Text style={s.btnPrimaryText}>Enviar Super Like</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnSecondary} activeOpacity={0.7} onPress={onClose}>
            <Text style={[s.btnSecondaryText, { color: colors.textLight }]}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         24,
  },
  content: {
    width:        '100%',
    maxWidth:     400,
    borderRadius: 28,
    borderWidth:  1,
    padding:      24,
    alignItems:   'center',
    boxShadow:    boxShadow('#FFD700', 12, 30, 0.30),
  },
  iconHalo: {
    marginBottom: 16,
  },
  iconCircle: {
    width:          84,
    height:         84,
    borderRadius:   42,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    borderColor:    'rgba(255,215,0,0.40)',
  },
  title: {
    fontSize:     22,
    fontWeight:   '900',
    marginBottom: 8,
    textAlign:    'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize:     14,
    textAlign:    'center',
    lineHeight:   20,
    marginBottom: 22,
  },
  benefits: {
    width:        '100%',
    gap:          14,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  benefitIcon: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'rgba(255,215,0,0.30)',
  },
  benefitText: {
    flex:       1,
    fontSize:   14,
    fontWeight: '600',
    lineHeight: 19,
  },
  note: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   'rgba(255,215,0,0.08)',
    borderRadius:      14,
    paddingVertical:   9,
    paddingHorizontal: 14,
    marginBottom:      22,
  },
  noteText: {
    fontSize:   12,
    fontWeight: '700',
    color:      'rgba(255,215,0,0.95)',
  },
  btnPrimary: {
    width:           '100%',
    flexDirection:   'row',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius:    18,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    boxShadow:       boxShadow('#FFD700', 4, 14, 0.45),
  },
  btnPrimaryText: {
    color:      '#1A1300',
    fontSize:   16,
    fontWeight: '800',
  },
  btnSecondary: {
    width:           '100%',
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       4,
  },
  btnSecondaryText: {
    fontSize:   15,
    fontWeight: '600',
  },
});
