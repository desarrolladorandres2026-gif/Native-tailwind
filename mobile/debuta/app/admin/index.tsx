import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../components/services/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const { logout } = useAuth();
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.usuarios);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangeRole = async (id: string, newRole: string) => {
    try {
      await api.put(`/admin/users/${id}/role`, { rol: newRole });
      Alert.alert('Éxito', `Rol actualizado a ${newRole}`);
      fetchUsers();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el rol');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.first_name} {item.last_name} ({item.username})</Text>
      <Text style={styles.userRole}>Rol actual: {item.rol}</Text>
      
      <View style={styles.actions}>
        {item.rol !== 'admin' && (
          <TouchableOpacity style={styles.btn} onPress={() => handleChangeRole(item._id, 'admin')}>
            <Text style={styles.btnText}>Hacer Admin</Text>
          </TouchableOpacity>
        )}
        {item.rol !== 'asociado' && (
          <TouchableOpacity style={styles.btn} onPress={() => handleChangeRole(item._id, 'asociado')}>
            <Text style={styles.btnText}>Hacer Asociado</Text>
          </TouchableOpacity>
        )}
        {item.rol !== 'user' && (
          <TouchableOpacity style={styles.btn} onPress={() => handleChangeRole(item._id, 'user')}>
            <Text style={styles.btnText}>Hacer Usuario</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Administración</Text>
        <TouchableOpacity onPress={() => logout(() => router.replace('/login'))}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#222' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoutText: { color: '#FF6B8A', fontSize: 16 },
  userCard: { backgroundColor: '#1A1F2E', padding: 16, borderRadius: 8, marginBottom: 12 },
  userName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  userRole: { color: '#aaa', fontSize: 14, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: { backgroundColor: '#FF6B8A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});
