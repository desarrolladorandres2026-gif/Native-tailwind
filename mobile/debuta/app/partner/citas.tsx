import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../components/services/api';
import { useTheme } from '../../theme/ThemeContext';
import { useSocket } from '../../context/SocketContext';

interface CitaItem {
  matchId: string;
  pareja: Array<{
    first_name: string;
    last_name?: string;
    username: string;
    profile_picture?: { url: string } | null;
  }>;
  fechaSugerida: string;
  fechaAceptacion: string;
  estado: string;
}

export default function CitasScreen() {
  const { colors, isDark } = useTheme();
  const { socket } = useSocket();
  const [citas, setCitas] = useState<CitaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCitas = useCallback(async () => {
    try {
      const res = await api.get<{ citas: CitaItem[] }>('/asociado/citas');
      setCitas(res.citas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCitas(); }, [fetchCitas]);

  // Real-time: cuando llega una nueva cita confirmada
  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchCitas();
    socket.on('cita:confirmada', handler);
    return () => { socket.off('cita:confirmada', handler); };
  }, [socket, fetchCitas]);

  const renderCita = ({ item }: { item: CitaItem }) => {
    const user1 = item.pareja?.[0];
    const user2 = item.pareja?.[1];
    const fecha = new Date(item.fechaAceptacion);

    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        {/* Status bar */}
        <View style={s.cardStatus}>
          <View style={s.statusBadge}>
            <View style={[s.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={[s.statusText, { color: '#10B981' }]}>Confirmada</Text>
          </View>
          {item.fechaSugerida ? (
            <View style={[s.dateChip, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="calendar" size={12} color={colors.primary} />
              <Text style={[s.dateChipText, { color: colors.primary }]}>{item.fechaSugerida}</Text>
            </View>
          ) : null}
        </View>

        {/* Pareja */}
        <View style={s.coupleRow}>
          {user1 && (
            <View style={s.userCard}>
              {user1.profile_picture?.url ? (
                <Image source={{ uri: user1.profile_picture.url }} style={s.avatar} />
              ) : (
                <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
              )}
              <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
                {user1.first_name}
              </Text>
            </View>
          )}

          <View style={s.heartWrap}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={s.heartCircle}
            >
              <Ionicons name="heart" size={16} color="#fff" />
            </LinearGradient>
          </View>

          {user2 && (
            <View style={s.userCard}>
              {user2.profile_picture?.url ? (
                <Image source={{ uri: user2.profile_picture.url }} style={s.avatar} />
              ) : (
                <View style={[s.avatarPlaceholder, { backgroundColor: colors.secondary + '20' }]}>
                  <Ionicons name="person" size={20} color={colors.secondary} />
                </View>
              )}
              <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
                {user2.first_name}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[s.cardFooter, { borderTopColor: colors.glassBorder }]}>
          <Ionicons name="time-outline" size={14} color={colors.textDim} />
          <Text style={[s.footerText, { color: colors.textDim }]}>
            Aceptada el {fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.header}>
          <Text style={[s.title, { color: colors.text }]}>Citas Confirmadas</Text>
          <View style={[s.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={s.countText}>{citas.length}</Text>
          </View>
        </View>

        <FlatList
          data={citas}
          keyExtractor={(item) => item.matchId}
          renderItem={renderCita}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCitas(); }} />
          }
          ListEmptyComponent={
            <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <LinearGradient
                colors={[colors.primary + '20', colors.secondary + '10']}
                style={s.emptyIcon}
              >
                <Ionicons name="heart-half-outline" size={50} color={colors.primary} />
              </LinearGradient>
              <Text style={[s.emptyTitle, { color: colors.text }]}>Sin citas aún</Text>
              <Text style={[s.emptySubtext, { color: colors.textDim }]}>
                Cuando parejas elijan tu local como lugar de primera cita, aparecerán aquí automáticamente.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  countText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  card: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardStatus: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  dateChipText: { fontSize: 12, fontWeight: '700' },

  coupleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginBottom: 16,
  },
  userCard: { alignItems: 'center', gap: 6, width: 80 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  heartWrap: { marginHorizontal: 4 },
  heartCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { fontSize: 12, fontWeight: '500' },

  emptyCard: {
    padding: 30, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', marginTop: 40,
  },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySubtext: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22 },
});
