import React from 'react';
import { Modal, View, StyleSheet, Image, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  title?: string;
  loading?: boolean;
}

export default function PhotoViewerModal({ visible, imageUrl, onClose, onEdit, onDelete, title, loading }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={s.overlay} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.title}>{title || 'Vista previa'}</Text>
          <TouchableOpacity onPress={onClose} style={s.iconBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.image} resizeMode="contain" />
          ) : (
            <View style={s.placeholder}>
              <Ionicons name="image-outline" size={80} color="rgba(255,255,255,0.3)" />
              <Text style={s.placeholderText}>Sin imagen</Text>
            </View>
          )}
        </View>

        <View style={s.footer}>
          <TouchableOpacity style={s.actionBtn} onPress={onEdit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={24} color="#fff" />
                <Text style={s.actionText}>{imageUrl ? 'Cambiar' : 'Agregar'}</Text>
              </>
            )}
          </TouchableOpacity>
          
          {imageUrl && onDelete && (
            <TouchableOpacity style={[s.actionBtn, s.deleteBtn]} onPress={onDelete} disabled={loading}>
               {loading ? (
                  <ActivityIndicator color="#FF5864" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={24} color="#FF5864" />
                    <Text style={[s.actionText, { color: '#FF5864' }]}>Eliminar</Text>
                  </>
                )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  iconBtn: {
    padding: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    minWidth: 80,
  },
  deleteBtn: {
    marginLeft: 20,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
});
