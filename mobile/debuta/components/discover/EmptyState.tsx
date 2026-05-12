import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props { onRefresh: () => void; }

const EmptyState: React.FC<Props> = ({ onRefresh }) => (
  <View style={styles.container}>
    <Ionicons name="heart-dislike-outline" size={64} color="rgba(45,27,61,0.14)" />
    <Text style={styles.title}>Sin más perfiles</Text>
    <Text style={styles.subtitle}>Vuelve más tarde o amplía tus filtros</Text>
    <TouchableOpacity style={styles.btn} onPress={onRefresh} activeOpacity={0.8}>
      <Text style={styles.btnText}>Actualizar</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  title: {
    color: 'rgba(45,27,61,0.48)', fontSize: 20, fontWeight: '600', marginTop: 16,
  },
  subtitle: {
    color: 'rgba(45,27,61,0.28)', fontSize: 14, textAlign: 'center',
  },
  btn: {
    marginTop: 16, paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: 'rgba(162,210,255,0.35)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(162,210,255,0.55)',
  },
  btnText: { color: '#7ab8f5', fontWeight: '600', fontSize: 15 },
});

export default EmptyState;
