import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '../../hooks/usePosts';

interface Props {
  post: Post;
  isOwner: boolean;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'ahora';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export default function PostCard({ post, isOwner, onDelete, onLike }: Props) {
  const avatarUrl = post.author?.profile_picture?.url;

  const confirmDelete = () =>
    Alert.alert('Eliminar', '¿Eliminar esta publicación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(post._id) },
    ]);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.avatarWrap}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}><Ionicons name="person" size={16} color="rgba(11,15,26,0.50)" /></View>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.authorName}>
            {post.author?.first_name} {post.author?.last_name}
            {post.author?.is_verified && (
              <Text style={{ color: '#5EA8FF' }}> ✓</Text>
            )}
          </Text>
          <Text style={s.time}>{timeAgo(post.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={confirmDelete} style={s.moreBtn}>
            <Ionicons name="trash-outline" size={16} color="rgba(11,15,26,0.50)" />
          </TouchableOpacity>
        )}
      </View>

      {!!post.text && <Text style={s.text}>{post.text}</Text>}
      {post.image?.url && (
        <Image source={{ uri: post.image.url }} style={s.postImage} resizeMode="cover" />
      )}

      <View style={s.footer}>
        <TouchableOpacity style={s.likeBtn} onPress={() => onLike(post._id)}>
          <Ionicons name="heart-outline" size={16} color="#FD297B" />
          <Text style={s.likeCount}>{post.likes.length}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  avatarWrap: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  authorName: { color: '#0B0F1A', fontWeight: '700', fontSize: 14 },
  time: { color: 'rgba(11,15,26,0.60)', fontSize: 12, marginTop: 2, fontWeight: '500' },
  moreBtn: { padding: 4 },
  text: { color: '#0B0F1A', fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
  postImage: { width: '100%', height: 240 },
  footer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeCount: { color: 'rgba(11,15,26,0.60)', fontSize: 13, fontWeight: '500' },
});
