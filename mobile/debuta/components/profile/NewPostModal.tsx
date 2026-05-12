import React from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string, imageUri?: string) => Promise<void>;
  posting: boolean;
}

export default function NewPostModal({ visible, onClose, onSubmit, posting }: Props) {
  const [text, setText] = React.useState('');
  const [imageUri, setImageUri] = React.useState<string | undefined>();

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!r.canceled) setImageUri(r.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageUri) return;
    await onSubmit(text, imageUri);
    setText('');
    setImageUri(undefined);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <View style={s.sheet}>
          <View style={s.drag} />
          <Text style={s.title}>Nueva publicación</Text>

          <TextInput
            style={s.input}
            placeholder="¿Qué estás pensando?"
            placeholderTextColor="rgba(11,15,26,0.4)"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />

          {imageUri && (
            <View style={s.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={s.imagePreview} resizeMode="cover" />
              <TouchableOpacity style={s.removeImg} onPress={() => setImageUri(undefined)}>
                <Ionicons name="close-circle" size={24} color="#FD297B" />
              </TouchableOpacity>
            </View>
          )}

          <View style={s.actions}>
            <TouchableOpacity style={s.imgBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={22} color="rgba(11,15,26,0.6)" />
              <Text style={s.imgBtnText}>Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitWrap, (!text.trim() && !imageUri) && { opacity: 0.4 }]}
              onPress={handleSubmit}
              disabled={posting || (!text.trim() && !imageUri)}
            >
              <LinearGradient colors={['#FD297B', '#FF655B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
                {posting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.submitText}>Publicar</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#EEEEEE' },
  drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(11,15,26,0.15)', alignSelf: 'center', marginBottom: 16 },
  title: { color: '#0B0F1A', fontSize: 17, fontWeight: '800', marginBottom: 14 },
  input: {
    minHeight: 100, backgroundColor: '#F5F5F5',
    borderRadius: 12, padding: 14, color: '#0B0F1A', fontSize: 15,
    borderWidth: 1, borderColor: '#EEEEEE', textAlignVertical: 'top', marginBottom: 12,
  },
  imagePreviewWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  imagePreview: { width: '100%', height: 160 },
  removeImg: { position: 'absolute', top: 8, right: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  imgBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: '#F5F5F5', borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  imgBtnText: { color: 'rgba(11,15,26,0.7)', fontSize: 13, fontWeight: '600' },
  cancelBtn: { flex: 1 },
  cancelText: { color: 'rgba(11,15,26,0.6)', fontSize: 14, textAlign: 'center', fontWeight: '600' },
  submitWrap: { borderRadius: 10, overflow: 'hidden' },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 11 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
