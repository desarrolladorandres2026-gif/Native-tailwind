import { useState, useCallback } from 'react';
import { api } from '../components/services/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PostAuthor {
  id:              string;
  first_name:      string;
  last_name:       string;
  username:        string;
  profile_picture: { url: string; public_id: string } | null;
  is_verified:     boolean;
}

export interface Post {
  _id:       string;
  author:    PostAuthor;
  text:      string;
  image?:    { url: string; public_id: string };
  likes:     string[];
  createdAt: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePosts(userId?: string) {
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  // ── Obtener posts ────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = userId ? `/posts/user/${userId}` : '/posts/me';
      const data = await api.get<{ posts: Post[] }>(endpoint);
      setPosts(data.posts);
    } catch (e: any) {
      console.error('usePosts.fetchPosts:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Crear post ───────────────────────────────────────────────────────────────
  const createPost = useCallback(async (text: string, imageUri?: string): Promise<boolean> => {
    setPosting(true);
    try {
      const formData = new FormData();
      if (text?.trim()) formData.append('text', text.trim());
      if (imageUri) {
        formData.append('photo', {
          uri:  imageUri,
          name: 'post.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const res = await api.postForm<{ post: Post }>('/posts', formData);
      setPosts(prev => [res.post, ...prev]);
      return true;
    } catch (e: any) {
      console.error('usePosts.createPost:', e?.response?.data || e?.message);
      return false;
    } finally {
      setPosting(false);
    }
  }, []);

  // ── Like / unlike ────────────────────────────────────────────────────────────
  const toggleLike = useCallback(async (postId: string): Promise<void> => {
    try {
      const data = await api.post<{ likes: number; liked: boolean }>(
        `/posts/${postId}/like`, {}
      );
      setPosts(prev =>
        prev.map(p =>
          p._id === postId
            ? { ...p, likes: data.liked
                ? [...p.likes, 'me']
                : p.likes.filter((_, i) => i !== p.likes.length - 1) }
            : p
        )
      );
    } catch (e: any) {
      console.error('usePosts.toggleLike:', e?.message);
    }
  }, []);

  // ── Eliminar post ────────────────────────────────────────────────────────────
  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      return true;
    } catch (e: any) {
      console.error('usePosts.deletePost:', e?.message);
      return false;
    }
  }, []);

  return { posts, loading, posting, fetchPosts, createPost, toggleLike, deletePost };
}
