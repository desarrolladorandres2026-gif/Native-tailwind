// ReportModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const MOTIVOS = [
  { key: 'spam',                    label: 'Spam o publicidad',         icon: 'megaphone' },
  { key: 'perfil_falso',            label: 'Perfil falso',              icon: 'person-remove' },
  { key: 'contenido_inapropiado',   label: 'Contenido inapropiado',     icon: 'warning' },
  { key: 'acoso',                   label: 'Acoso o amenazas',          icon: 'alert-circle' },
  { key: 'otro',                    label: 'Otro motivo',               icon: 'help-circle' },
];

interface Props {
  visible:      boolean;
  userId:       string;
  userName:     string;
  onClose:      () => void;
  onReported?:  () => void;
}

export default function ReportModal({ visible, userId, userName, onClose, onReported }: Props) {
  const [motivo,      setMotivo]      = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sending,     setSending]     = useState(false);

  const handleReport = async () => {
    if (!motivo) return Alert.alert('Atención', 'Elige un motivo');
    Keyboard.dismiss();
    setSending(true);
    try {
      await api.post(`/report/${userId}`, { motivo, descripcion });
      onClose();
      onReported?.();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally { setSending(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          
          <View style={s.header}>
            <Text style={s.title}>Reportar a @{userName}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {MOTIVOS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[s.motivoRow, motivo === m.key && s.motivoActive]}
                onPress={() => setMotivo(m.key)}
              >
                <Ionicons name={m.icon as any} size={20} color={motivo === m.key ? '#FF3B30' : '#8E8E93'} />
                <Text style={[s.motivoText, motivo === m.key && s.motivoTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={s.textArea}
              placeholder="¿Algo más que debamos saber? (opcional)"
              placeholderTextColor="#8E8E93"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />

            <TouchableOpacity
              style={[s.reportBtn, (!motivo || sending) && { opacity: 0.5 }]}
              onPress={handleReport}
              disabled={!motivo || sending}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.reportBtnText}>Enviar reporte</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={s.cancel}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 40, backgroundColor: '#FFFFFF' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: '#F2F2F7' },
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#000' },
  motivoRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 8, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: 'transparent' },
  motivoActive: { borderColor: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.05)' },
  motivoText: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '600', color: '#000' },
  motivoTextActive: { color: '#FF3B30', fontWeight: '800' },
  textArea: { borderRadius: 15, padding: 15, fontSize: 15, minHeight: 100, textAlignVertical: 'top', marginTop: 10, backgroundColor: '#F2F2F7', color: '#000' },
  reportBtn: { borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 25, backgroundColor: '#FF3B30' },
  reportBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancel: { alignItems: 'center', marginTop: 20, paddingVertical: 10 },
  cancelText: { color: '#8E8E93', fontWeight: '700' },
});