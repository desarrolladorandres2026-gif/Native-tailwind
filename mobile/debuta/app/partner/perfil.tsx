import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../components/services/api';
import { useTheme } from '../../theme/ThemeContext';

const CATEGORIAS = [
  'italiano', 'mexicano', 'japonés', 'chino', 'colombiano',
  'peruano', 'francés', 'americano', 'bar', 'café',
  'pizzería', 'mariscos', 'parrilla', 'vegetariano',
  'fusión', 'postres', 'otro',
];

const AMBIENTES = ['romántico', 'casual', 'elegante', 'familiar', 'fiesta', 'terraza', 'íntimo'];
const PRECIOS = ['$', '$$', '$$$', '$$$$'];

export default function PerfilScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ambiente, setAmbiente] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [horario, setHorario] = useState('');
  const [precioPromedio, setPrecioPromedio] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ restaurante: any }>('/asociado/restaurante');
      const r = res.restaurante;
      setNombre(r.nombre || '');
      setDescripcion(r.descripcion || '');
      setCategoria(r.categoria || '');
      setAmbiente(r.ambiente || '');
      setDireccion(r.direccion || '');
      setCiudad(r.ciudad || '');
      setTelefono(r.telefono || '');
      setHorario(r.horario || '');
      setPrecioPromedio(r.precio_promedio || '');
      setWebsite(r.website || '');
      setInstagram(r.instagram || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del local es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await api.put('/asociado/restaurante', {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria,
        ambiente,
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        telefono: telefono.trim(),
        horario: horario.trim(),
        precio_promedio: precioPromedio,
        website: website.trim(),
        instagram: instagram.trim(),
      });
      Alert.alert('✅ Guardado', 'La información se actualizó correctamente');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const ChipSelector = ({
    label, options, value, onChange
  }: {
    label: string; options: string[]; value: string; onChange: (v: string) => void;
  }) => (
    <View style={s.fieldGroup}>
      <Text style={[s.label, { color: colors.primary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[
              s.chip,
              {
                backgroundColor: value === opt ? colors.primary : colors.bg[0],
                borderColor: value === opt ? colors.primary : colors.glassBorder,
              },
            ]}
            onPress={() => onChange(value === opt ? '' : opt)}
          >
            <Text style={[
              s.chipText,
              { color: value === opt ? '#fff' : colors.textDim },
            ]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[s.title, { color: colors.text }]}>Mi Local</Text>
            <Text style={[s.subtitle, { color: colors.textDim }]}>
              Información que verán las parejas
            </Text>

            {/* ── Campos de texto ────────────────────────────── */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: colors.primary }]}>Nombre del Local *</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Restaurante La Casa"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: colors.primary }]}>Descripción</Text>
              <TextInput
                style={[s.input, s.inputMulti, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Describe tu lugar..."
                placeholderTextColor={colors.textDim}
                multiline
                maxLength={500}
              />
              <Text style={[s.charCount, { color: colors.textDim }]}>{descripcion.length}/500</Text>
            </View>

            <ChipSelector label="Categoría" options={CATEGORIAS} value={categoria} onChange={setCategoria} />
            <ChipSelector label="Ambiente" options={AMBIENTES} value={ambiente} onChange={setAmbiente} />
            <ChipSelector label="Rango de Precio" options={PRECIOS} value={precioPromedio} onChange={setPrecioPromedio} />

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: colors.primary }]}>Dirección</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                value={direccion}
                onChangeText={setDireccion}
                placeholder="Calle 123 #45-67"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={s.row}>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={[s.label, { color: colors.primary }]}>Ciudad</Text>
                <TextInput
                  style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                  value={ciudad}
                  onChangeText={setCiudad}
                  placeholder="Bogotá"
                  placeholderTextColor={colors.textDim}
                />
              </View>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={[s.label, { color: colors.primary }]}>Teléfono</Text>
                <TextInput
                  style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder="3001234567"
                  placeholderTextColor={colors.textDim}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: colors.primary }]}>Horario</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                value={horario}
                onChangeText={setHorario}
                placeholder="Lun-Sáb 12:00-22:00"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: colors.primary }]}>Instagram</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                value={instagram}
                onChangeText={setInstagram}
                placeholder="@mirestaurante"
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.label, { color: colors.primary }]}>Website</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://mirestaurante.com"
                placeholderTextColor={colors.textDim}
                keyboardType="url"
              />
            </View>

            {/* ── Botón guardar ──────────────────────────────── */}
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
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
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={s.saveBtnText}>Guardar Cambios</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', paddingHorizontal: 20, paddingTop: 16, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '500', paddingHorizontal: 20, marginBottom: 20, marginTop: 4 },

  fieldGroup: { paddingHorizontal: 20, marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 6, marginLeft: 4,
  },
  input: {
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, fontWeight: '500',
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, fontWeight: '500', textAlign: 'right', marginTop: 4, marginRight: 4 },

  row: { flexDirection: 'row', gap: 10 },

  chipScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  saveBtn: { marginHorizontal: 20, borderRadius: 22, overflow: 'hidden', marginTop: 10 },
  saveBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
