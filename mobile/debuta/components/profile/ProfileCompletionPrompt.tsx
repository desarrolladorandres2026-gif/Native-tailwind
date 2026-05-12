import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  percentage: number;
  missingFields: string[];
  onClose: () => void;
}

export default function ProfileCompletionPrompt({ visible, percentage, missingFields, onClose }: Props) {
  const handleContinue = () => {
    onClose();
    router.push('/(tabs)/profile' as any);
  };

  const getMissingText = () => {
    if (!missingFields || missingFields.length === 0) return '';
    return missingFields.map(f => f.toLowerCase()).join(', ');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.content}>
          <LinearGradient colors={['#FD297B', '#FF5864']} style={s.headerGradient}>
             <Ionicons name="sparkles" size={60} color="#fff" />
          </LinearGradient>
          
          <View style={s.body}>
            <Text style={s.title}>¡Casi listo!</Text>
            <Text style={s.description}>
              Tu perfil está al {percentage}%. Los perfiles completos reciben hasta 3 veces más matches.
            </Text>
            
            {missingFields && missingFields.length > 0 && (
              <View style={s.missingContainer}>
                <Text style={s.missingTitle}>Te falta agregar:</Text>
                <Text style={s.missingList}>{getMissingText()}</Text>
              </View>
            )}

            <View style={s.progressContainer}>
              <View style={[s.progressBar, { width: `${percentage}%` }]} />
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={handleContinue}>
              <Text style={s.btnPrimaryText}>Continuar Completando</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnSecondary} onPress={onClose}>
              <Text style={s.btnSecondaryText}>Omitir por ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  headerGradient: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2D1B3D',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  missingContainer: {
    width: '100%',
    backgroundColor: '#FDF2F5',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE4EB',
  },
  missingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FD297B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  missingList: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FD297B',
    borderRadius: 5,
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#FD297B',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FD297B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  btnSecondary: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#9E9E9E',
    fontSize: 15,
    fontWeight: '600',
  },
});
