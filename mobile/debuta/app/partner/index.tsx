import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, StatusBar, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../components/services/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');

interface Estadisticas {
  totalCitas: number;
  citasMes: number;
  citasPendientes: number;
}

interface Restaurante {
  nombre: string;
  foto_portada: { url: string } | null;
  fotos: { url: string }[];
  categoria: string;
  direccion: string;
}

export default function PartnerDashboard() {
  const { colors, isDark } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [citasRecientes, setCitasRecientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, restRes, citasRes, name] = await Promise.all([
        api.get<{ estadisticas: Estadisticas }>('/asociado/estadisticas'),
        api.get<{ restaurante: Restaurante }>('/asociado/restaurante'),
        api.get<{ citas: any[] }>('/asociado/citas'),
        AsyncStorage.getItem('user_name'),
      ]);
      setStats(statsRes.estadisticas);
      setRestaurante(restRes.restaurante);
      setCitasRecientes(citasRes.citas.slice(0, 5));
      setUserName(name || '');
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Listener de citas confirmadas en tiempo real
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      console.log('🔔 Cita confirmada:', data);
      fetchData(); // Refrescar datos
    };
    socket.on('cita:confirmada', handler);
    return () => { socket.off('cita:confirmada', handler); };
  }, [socket, fetchData]);

  const handleLogout = async () => {
    await logout(() => router.replace('/login'));
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const portadaUrl = restaurante?.foto_portada?.url || restaurante?.fotos?.[0]?.url;

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? ['#0D0D1A', '#12091F', '#0D0D1A'] : ['#F9F9FB', '#FFFFFF', '#F9F9FB']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
          }
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={s.header}>
            <View>
              <Text style={[s.greeting, { color: colors.textDim }]}>Bienvenido de vuelta</Text>
              <Text style={[s.headerName, { color: colors.text }]}>
                {userName || 'Asociado'} 👋
              </Text>
            </View>
            <TouchableOpacity
              style={[s.logoutBtn, { backgroundColor: isDark ? 'rgba(255,107,138,0.15)' : 'rgba(255,107,138,0.1)' }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Banner del restaurante ──────────────────────────────── */}
          <View style={s.bannerWrap}>
            {portadaUrl ? (
              <Image source={{ uri: portadaUrl }} style={s.banner} />
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={s.banner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="storefront" size={50} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={s.bannerOverlay}
            >
              <Text style={s.bannerTitle}>
                {restaurante?.nombre || 'Configura tu restaurante'}
              </Text>
              {restaurante?.categoria ? (
                <View style={s.bannerTag}>
                  <Ionicons name="pricetag" size={12} color="#fff" />
                  <Text style={s.bannerTagText}>{restaurante.categoria}</Text>
                </View>
              ) : null}
            </LinearGradient>
          </View>

          {/* ── Tarjetas de estadísticas ────────────────────────────── */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <LinearGradient
                colors={[colors.primary + '30', colors.primary + '05']}
                style={s.statIconBg}
              >
                <Ionicons name="heart" size={24} color={colors.primary} />
              </LinearGradient>
              <Text style={[s.statNumber, { color: colors.text }]}>
                {stats?.totalCitas ?? 0}
              </Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>Total Citas</Text>
            </View>

            <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <LinearGradient
                colors={[colors.secondary + '30', colors.secondary + '05']}
                style={s.statIconBg}
              >
                <Ionicons name="calendar" size={24} color={colors.secondary} />
              </LinearGradient>
              <Text style={[s.statNumber, { color: colors.text }]}>
                {stats?.citasMes ?? 0}
              </Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>Este Mes</Text>
            </View>

            <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <LinearGradient
                colors={['#F59E0B30', '#F59E0B05']}
                style={s.statIconBg}
              >
                <Ionicons name="time" size={24} color="#F59E0B" />
              </LinearGradient>
              <Text style={[s.statNumber, { color: colors.text }]}>
                {stats?.citasPendientes ?? 0}
              </Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>Pendientes</Text>
            </View>
          </View>

          {/* ── Acciones rápidas ─────────────────────────────────────── */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Acciones Rápidas</Text>
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
              onPress={() => router.push('/partner/fotos')}
            >
              <LinearGradient colors={[colors.primary, colors.secondary]} style={s.actionIcon}>
                <Ionicons name="camera" size={22} color="#fff" />
              </LinearGradient>
              <Text style={[s.actionText, { color: colors.text }]}>Fotos</Text>
              <Text style={[s.actionSub, { color: colors.textDim }]}>
                {restaurante?.fotos?.length ?? 0} fotos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
              onPress={() => router.push('/partner/menu')}
            >
              <LinearGradient colors={['#8B5CF6', '#6366F1']} style={s.actionIcon}>
                <Ionicons name="restaurant" size={22} color="#fff" />
              </LinearGradient>
              <Text style={[s.actionText, { color: colors.text }]}>Menú</Text>
              <Text style={[s.actionSub, { color: colors.textDim }]}>Editar platos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
              onPress={() => router.push('/partner/perfil')}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={s.actionIcon}>
                <Ionicons name="create" size={22} color="#fff" />
              </LinearGradient>
              <Text style={[s.actionText, { color: colors.text }]}>Info</Text>
              <Text style={[s.actionSub, { color: colors.textDim }]}>Editar datos</Text>
            </TouchableOpacity>
          </View>

          {/* ── Citas recientes ──────────────────────────────────────── */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Citas Recientes</Text>
          {citasRecientes.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <Ionicons name="heart-dislike-outline" size={40} color={colors.textDim} />
              <Text style={[s.emptyText, { color: colors.textDim }]}>
                Aún no hay citas confirmadas
              </Text>
              <Text style={[s.emptySubtext, { color: colors.textLight }]}>
                Cuando parejas elijan tu local, aparecerán aquí
              </Text>
            </View>
          ) : (
            citasRecientes.map((cita, i) => (
              <View key={cita.matchId || i} style={[s.citaCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                <View style={s.citaHeader}>
                  <View style={[s.citaStatusDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[s.citaStatus, { color: '#10B981' }]}>Confirmada</Text>
                  {cita.fechaSugerida ? (
                    <Text style={[s.citaFecha, { color: colors.textDim }]}>
                      {cita.fechaSugerida}
                    </Text>
                  ) : null}
                </View>
                <View style={s.citaPareja}>
                  {cita.pareja?.map((u: any, idx: number) => (
                    <View key={idx} style={s.citaUser}>
                      {u.profile_picture?.url ? (
                        <Image source={{ uri: u.profile_picture.url }} style={s.citaAvatar} />
                      ) : (
                        <View style={[s.citaAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons name="person" size={16} color={colors.primary} />
                        </View>
                      )}
                      <Text style={[s.citaName, { color: colors.text }]}>
                        {u.first_name} {u.last_name || ''}
                      </Text>
                    </View>
                  ))}
                  {cita.pareja?.length === 2 && (
                    <Ionicons name="heart" size={16} color={colors.primary} style={{ marginHorizontal: 8 }} />
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  headerName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  logoutBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  // Banner
  bannerWrap: {
    marginHorizontal: 20, borderRadius: 20, overflow: 'hidden',
    height: 180, marginBottom: 20,
  },
  banner: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingTop: 40,
  },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  bannerTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bannerTagText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24,
  },
  statCard: {
    flex: 1, padding: 14, borderRadius: 18, borderWidth: 1,
    alignItems: 'center',
  },
  statIconBg: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  statNumber: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Section
  sectionTitle: {
    fontSize: 20, fontWeight: '800', paddingHorizontal: 20, marginBottom: 14,
    letterSpacing: -0.3,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24,
  },
  actionCard: {
    flex: 1, padding: 16, borderRadius: 18, borderWidth: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  actionText: { fontSize: 14, fontWeight: '700' },
  actionSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Empty
  emptyCard: {
    marginHorizontal: 20, padding: 30, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', marginBottom: 20,
  },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { fontSize: 13, fontWeight: '500', marginTop: 6, textAlign: 'center' },

  // Citas
  citaCard: {
    marginHorizontal: 20, padding: 16, borderRadius: 16, borderWidth: 1,
    marginBottom: 10,
  },
  citaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  citaStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  citaStatus: { fontSize: 13, fontWeight: '700', flex: 1 },
  citaFecha: { fontSize: 12, fontWeight: '600' },
  citaPareja: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  citaUser: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  citaAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 6 },
  citaAvatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16, marginRight: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  citaName: { fontSize: 14, fontWeight: '600' },
});
