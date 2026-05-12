import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../components/services/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';

export default function PartnerDashboard() {
  const [citas, setCitas] = useState<any[]>([]);
  const { logout } = useAuth();
  const router = useRouter();

  const fetchCitas = async () => {
    try {
      const response = await api.get('/asociado/citas');
      setCitas(response.citas);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las citas');
    }
  };

  useEffect(() => {
    fetchCitas();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Cita Confirmada</Text>
      <Text style={styles.text}>Pareja:</Text>
      {item.pareja.map((u: any, index: number) => (
        <Text key={index} style={styles.user}>- {u.first_name} {u.last_name}</Text>
      ))}
      <Text style={styles.date}>Fecha de aceptación: {new Date(item.fechaAceptacion).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleHeader}>Panel de Restaurante</Text>
        <TouchableOpacity onPress={() => logout(() => router.replace('/login'))}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={citas}
        keyExtractor={(item) => item.matchId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: '#aaa', textAlign: 'center' }}>No hay citas confirmadas aún.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#222' },
  titleHeader: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoutText: { color: '#FF6B8A', fontSize: 16 },
  card: { backgroundColor: '#1A1F2E', padding: 16, borderRadius: 8, marginBottom: 12 },
  title: { color: '#FF6B8A', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  text: { color: '#fff', fontSize: 14, marginBottom: 4 },
  user: { color: '#ddd', fontSize: 14, marginLeft: 8 },
  date: { color: '#aaa', fontSize: 12, marginTop: 8 }
});
