import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width: W } = Dimensions.get('window');

interface Props {
  visible:         boolean;
  name:            string;
  onClose:         () => void;
  matchId?:        string;  // ID del match para ir al chat
  matchedUserId?:  string;  // ID del otro usuario
  matchedPhoto?:   string;  // Foto del otro usuario (opcional)
}

const MatchModal: React.FC<Props> = ({
  visible, name, onClose, matchId, matchedUserId, matchedPhoto,
}) => {
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Ícono */}
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={40} color="#e8659a" />
          </View>

          <Text style={styles.title}>¡Es un Match!</Text>
          <Text style={styles.subtitle}>
            Tú y <Text style={styles.name}>{name}</Text> se gustaron mutuamente
          </Text>

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => {
              onClose();
              // Navegar al chat si tenemos los datos del match
              if (matchedUserId) {
                router.push({
                  pathname: '/chat/[userId]',
                  params: {
                    userId: matchedUserId,
                    name:   name,
                    photo:  matchedPhoto ?? '',
                  },
                });
              }
            }}
          >
            <Text style={styles.btnPrimaryText}>Enviar mensaje 💬</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnSecondaryText}>Seguir explorando</Text>
          </TouchableOpacity>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(45,27,61,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  card: {
    width:           W * 0.82,
    backgroundColor: '#FFF4FA',
    borderRadius:    24,
    padding:         32,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     'rgba(232,101,154,0.30)',
    shadowColor:     '#cdb4db',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.25,
    shadowRadius:    20,
    elevation:       12,
  },
  iconCircle: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: 'rgba(232,101,154,0.12)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    20,
  },
  title: {
    color:      '#2d1b3d',
    fontSize:   28,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color:       'rgba(45,27,61,0.58)',
    fontSize:    15,
    textAlign:   'center',
    lineHeight:  22,
    marginBottom: 28,
  },
  name: {
    color:      '#e8659a',
    fontWeight: '600',
  },
  btnPrimary: {
    width:           '100%',
    backgroundColor: '#e8659a',
    borderRadius:    14,
    paddingVertical: 14,
    alignItems:      'center',
    marginBottom:    12,
  },
  btnPrimaryText: {
    color:      '#FFFFFF',
    fontSize:   16,
    fontWeight: '700',
  },
  btnSecondary: {
    width:           '100%',
    borderRadius:    14,
    paddingVertical: 14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     'rgba(45,27,61,0.14)',
  },
  btnSecondaryText: {
    color:    'rgba(45,27,61,0.58)',
    fontSize: 16,
  },
});

export default MatchModal;
