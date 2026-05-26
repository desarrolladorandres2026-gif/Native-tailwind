import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '../../components/services/api';
import { useTheme } from '../../theme/ThemeContext';

const { width: W } = Dimensions.get('window');
const PHOTO_SIZE = (W - 60) / 3;

interface Foto {
  url: string;
  public_id: string;
}

export default function FotosScreen() {
  const { colors, isDark } = useTheme();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [portada, setPortada] = useState<Foto | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFotos = useCallback(async () => {
    try {
      const res = await api.get<{ restaurante: any }>('/asociado/restaurante');
      setFotos(res.restaurante.fotos || []);
      setPortada(res.restaurante.foto_portada || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFotos(); }, [fetchFotos]);

  const pickAndUpload = async (esPortada: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: esPortada ? [16, 9] : [1, 1],
    });

    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);

    try {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: 'base64' as any,
      });

      await api.post('/asociado/restaurante/fotos', {
        fotos: base64,
        esPortada,
      });
      await fetchFotos();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (publicId: string) => {
    Alert.alert('Eliminar foto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/asociado/restaurante/fotos/${encodeURIComponent(publicId)}`);
            await fetchFotos();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'No se pudo eliminar');
          }
        },
      },
    ]);
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <Text style={[s.title, { color: colors.text }]}>Fotos del Local</Text>
          <Text style={[s.subtitle, { color: colors.textDim }]}>
            Muestra tu lugar para atraer parejas
          </Text>

          {/* ── Foto de portada ───────────────────────────────── */}
          <Text style={[s.sectionLabel, { color: colors.text }]}>Foto de Portada</Text>
          <TouchableOpacity
            style={[s.coverWrap, { borderColor: colors.glassBorder }]}
            onPress={() => pickAndUpload(true)}
            disabled={uploading}
          >
            {portada ? (
              <>
                <Image source={{ uri: portada.url }} style={s.coverImage} />
                <TouchableOpacity
                  style={s.deleteOverlay}
                  onPress={() => handleDelete(portada.public_id)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <LinearGradient
                colors={[colors.primary + '20', colors.secondary + '10']}
                style={s.coverPlaceholder}
              >
                <Ionicons name="camera-outline" size={40} color={colors.primary} />
                <Text style={[s.coverPlaceholderText, { color: colors.primary }]}>
                  Agregar portada
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          {/* ── Galería ───────────────────────────────────────── */}
          <View style={s.galleryHeader}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>
              Galería ({fotos.length}/10)
            </Text>
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => pickAndUpload(false)}
              disabled={uploading || fotos.length >= 10}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={s.addBtnText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {uploading && (
            <View style={s.uploadingBar}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.uploadingText, { color: colors.textDim }]}>Subiendo foto...</Text>
            </View>
          )}

          <View style={s.grid}>
            {fotos.map((foto, i) => (
              <View key={foto.public_id || i} style={s.gridItem}>
                <Image source={{ uri: foto.url }} style={[s.gridImage, { borderColor: colors.glassBorder }]} />
                <TouchableOpacity
                  style={s.gridDelete}
                  onPress={() => handleDelete(foto.public_id)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {fotos.length === 0 && (
              <Text style={[s.emptyText, { color: colors.textDim }]}>
                No hay fotos en la galería
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', paddingHorizontal: 20, paddingTop: 16, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '500', paddingHorizontal: 20, marginBottom: 20, marginTop: 4 },
  sectionLabel: { fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },

  coverWrap: {
    marginHorizontal: 20, height: 180, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, marginBottom: 20,
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  coverPlaceholderText: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  deleteOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  galleryHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingRight: 20,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  uploadingText: { fontSize: 13, fontWeight: '500' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 10,
  },
  gridItem: { position: 'relative' },
  gridImage: {
    width: PHOTO_SIZE, height: PHOTO_SIZE,
    borderRadius: 14, borderWidth: 1,
  },
  gridDelete: { position: 'absolute', top: -6, right: -6 },
  emptyText: { fontSize: 14, fontWeight: '500', paddingVertical: 20 },
});
