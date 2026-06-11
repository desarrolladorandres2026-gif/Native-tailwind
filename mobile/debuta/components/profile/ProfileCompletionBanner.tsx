import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { boxShadow } from '../utils/shadow';

interface Props {
  percentage: number;
  missingFields: string[];
}

export default function ProfileCompletionBanner({ percentage, missingFields }: Props) {
  if (percentage >= 100) return null;

  const handlePress = () => {
    router.push('/(tabs)/profile' as any);
  };

  const getMissingText = () => {
    if (missingFields.length === 0) return '';
    if (missingFields.length === 1) return `Te falta agregar tu ${missingFields[0].toLowerCase()}.`;
    return `Completa tu perfil agregando ${missingFields[0].toLowerCase()}, ${missingFields[1].toLowerCase()}...`;
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={s.container}>
      <LinearGradient
        colors={['#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.gradient}
      >
        <View style={s.content}>
          <View style={s.info}>
            <View style={s.header}>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={s.title}>Perfil al {percentage}%</Text>
            </View>
            <Text style={s.subtitle} numberOfLines={1}>
              {getMissingText()}
            </Text>
          </View>

          <View style={s.action}>
            <View style={s.btn}>
              <Text style={s.btnText}>Completar</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563EB" />
            </View>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={s.progressContainer}>
          <View style={[s.progressBar, { width: `${percentage}%` }]} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: boxShadow('#2563EB', 4, 8, 0.2),
  },
  gradient: {
    padding: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  action: {
    justifyContent: 'center',
  },
  btn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
