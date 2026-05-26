import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '../../components/services/api';
import { useTheme } from '../../theme/ThemeContext';

interface Plato {
  _id?: string;
  nombre: string;
  descripcion: string;
  precio: string;
  foto: { url: string; public_id: string } | null;
}

export default function MenuScreen() {
  const { colors, isDark } = useTheme();
  const [menu, setMenu] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await api.get<{ restaurante: any }>('/asociado/restaurante');
      setMenu(res.restaurante.menu || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const handleAdd = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del plato es obligatorio');
      return;
    }
    setSaving(true);
    try {
      let fotoBase64: string | undefined;
      if (fotoUri) {
        fotoBase64 = await FileSystem.readAsStringAsync(fotoUri, {
          encoding: 'base64' as any,
        });
      }

      await api.post('/asociado/restaurante/menu/plato', {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio: precio.trim(),
        fotoBase64,
      });

      setShowModal(false);
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setFotoUri(null);
      await fetchMenu();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo agregar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (platoId: string) => {
    Alert.alert('Eliminar plato', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/asociado/restaurante/menu/${platoId}`);
            await fetchMenu();
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
          <View style={s.headerRow}>
            <View>
              <Text style={[s.title, { color: colors.text }]}>Menú</Text>
              <Text style={[s.subtitle, { color: colors.textDim }]}>
                {menu.length} platos • Máx. 30
              </Text>
            </View>
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowModal(true)}
              disabled={menu.length >= 30}
            >
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={s.addBtnText}>Nuevo</Text>
            </TouchableOpacity>
          </View>

          {menu.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <Ionicons name="restaurant-outline" size={48} color={colors.textDim} />
              <Text style={[s.emptyText, { color: colors.textDim }]}>No hay platos aún</Text>
              <Text style={[s.emptySubtext, { color: colors.textLight }]}>
                Agrega platos para que las parejas vean tu menú
              </Text>
            </View>
          ) : (
            menu.map((plato, i) => (
              <View key={plato._id || i} style={[s.platoCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                {plato.foto?.url && (
                  <Image source={{ uri: plato.foto.url }} style={s.platoImage} />
                )}
                <View style={s.platoInfo}>
                  <Text style={[s.platoNombre, { color: colors.text }]}>{plato.nombre}</Text>
                  {plato.descripcion ? (
                    <Text style={[s.platoDesc, { color: colors.textDim }]} numberOfLines={2}>
                      {plato.descripcion}
                    </Text>
                  ) : null}
                  {plato.precio ? (
                    <Text style={[s.platoPrecio, { color: colors.primary }]}>{plato.precio}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => handleDelete(plato._id!)}>
                  <Ionicons name="trash-outline" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Modal para agregar plato ───────────────────────── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Nuevo Plato</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textDim} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[s.photoBtn, { borderColor: colors.glassBorder }]} onPress={pickImage}>
              {fotoUri ? (
                <Image source={{ uri: fotoUri }} style={s.photoBtnImage} />
              ) : (
                <View style={s.photoBtnPlaceholder}>
                  <Ionicons name="camera" size={28} color={colors.textDim} />
                  <Text style={[s.photoBtnText, { color: colors.textDim }]}>Foto (opcional)</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={[s.input, { color: colors.text, backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]}
              placeholder="Nombre del plato *"
              placeholderTextColor={colors.textDim}
              value={nombre}
              onChangeText={setNombre}
            />
            <TextInput
              style={[s.input, s.inputMulti, { color: colors.text, backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]}
              placeholder="Descripción (opcional)"
              placeholderTextColor={colors.textDim}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />
            <TextInput
              style={[s.input, { color: colors.text, backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]}
              placeholder="Precio (ej: $15.000)"
              placeholderTextColor={colors.textDim}
              value={precio}
              onChangeText={setPrecio}
            />

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.saveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Agregar Plato</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyCard: {
    marginHorizontal: 20, padding: 30, borderRadius: 18, borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { fontSize: 13, fontWeight: '500', marginTop: 6, textAlign: 'center' },

  platoCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
    padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 10,
  },
  platoImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  platoInfo: { flex: 1 },
  platoNombre: { fontSize: 16, fontWeight: '700' },
  platoDesc: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  platoPrecio: { fontSize: 14, fontWeight: '800', marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  photoBtn: {
    width: '100%', height: 120, borderRadius: 16,
    borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden',
    marginBottom: 16,
  },
  photoBtnImage: { width: '100%', height: '100%' },
  photoBtnPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  photoBtnText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 15, fontWeight: '500', marginBottom: 12,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { borderRadius: 22, overflow: 'hidden', marginTop: 8 },
  saveBtnGradient: {
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
