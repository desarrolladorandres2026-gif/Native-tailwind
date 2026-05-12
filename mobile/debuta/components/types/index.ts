export interface Afinidad {
  score: number;
  amigosFB: number;
  interesesComun: number;
  ciudadComun: boolean;
  edadSimilar: boolean;
  resumen: string | null;   // Ej: "2 amigos en común · 3 intereses en común"
}

export interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  birth_date: string;
  gender: string;
  profile_picture: { url: string; public_id: string } | string | null;
  cover_photo?: { url: string; public_id: string } | null;
  photos?: { url: string; public_id: string }[];
  latitude: number | null;
  longitude: number | null;
  is_verified?: boolean;
  ciudad?: string;
  pais?: string;
  location_label?: string;
  interests: { name: string; icon: string }[];
  job_title?: string;
  company?: string;
  education?: string;
  relationship_status?: string;
  website?: string;
  afinidad?: Afinidad;    // Presente en discover, undefined en otros contextos
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

// MatchesScreen usa match.matched_user (no match.user)
export interface Match {
  id: string;
  matched_user: UserProfile;   // ← antes era "user", ahora "matched_user"
  created_at: string;
  last_message?: Message;
  unread_count?: number;
  recomendacion?: {
    asociadoId: string;
    estado: string;
    user1Acepta: boolean;
    user2Acepta: boolean;
  } | null;
}
