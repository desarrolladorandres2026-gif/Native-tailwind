import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Image, ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types';
import { getAge } from '../utils/age';
import { boxShadow } from '../utils/shadow';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.round(H * 0.58);
const CARD_RADIUS = 28;
const COL = Math.floor((W - 40 - 12) / 3);

const RELATIONSHIP_LABELS: Record<string, string> = {
  single:          'Soltero/a',
  in_relationship: 'En una relación',
  married:         'Casado/a',
  complicated:     'Es complicado',
  prefer_not_say:  'Prefiero no decir',
};

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}

export default function UserProfileModal({ visible, profile, onClose, onLike, onPass }: Props) {
  if (!profile) return null;

  const age = getAge(profile.birth_date);
  const avatarUrl = typeof profile.profile_picture === 'object' && profile.profile_picture !== null
    ? profile.profile_picture.url
    : (profile.profile_picture ?? null);
  const coverUrl = profile.cover_photo?.url ?? null;
  const heroUrl = coverUrl || avatarUrl;

  const afinidad = profile.afinidad;
  const tieneConexion = afinidad && afinidad.score > 0 && afinidad.resumen;

  const infoItems: Array<{ icon: any; text: string }> = [];
  if (profile.job_title || profile.company) {
    infoItems.push({
      icon: 'briefcase-outline',
      text: profile.job_title && profile.company
        ? `${profile.job_title} en ${profile.company}`
        : profile.job_title || profile.company || '',
    });
  }
  if (profile.education) infoItems.push({ icon: 'school-outline', text: profile.education });
  if (profile.relationship_status) {
    infoItems.push({
      icon: 'heart-outline',
      text: RELATIONSHIP_LABELS[profile.relationship_status] || profile.relationship_status,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.container}>

          {/* Botón cerrar fijo sobre el scroll */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 130 }}
            bounces
          >
            {/* ─── HERO ─── */}
            <View style={s.hero}>
              {heroUrl ? (
                <Image source={{ uri: heroUrl }} style={s.heroImg} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={['#FD297B', '#FF5864', '#FF655B']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.78)']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.heroInfo}>
                <View style={s.heroNameRow}>
                  <Text style={s.heroName}>{profile.first_name || profile.username}</Text>
                  {age ? <Text style={s.heroAge}>, {age}</Text> : null}
                  {profile.is_verified && (
                    <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" style={s.verifiedIcon} />
                  )}
                </View>
                {(profile.location_label || profile.ciudad) ? (
                  <View style={s.heroLocRow}>
                    <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.75)" />
                    <Text style={s.heroLocText}>{profile.location_label || profile.ciudad}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ─── TARJETA DE CONTENIDO ─── */}
            <View style={s.card}>

              {/* Avatar + afinidad */}
              <View style={s.cardTopRow}>
                <View style={s.avatarRing}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
                  ) : (
                    <View style={[s.avatarImg, s.avatarFallback]}>
                      <Ionicons name="person" size={32} color="rgba(45,27,61,0.25)" />
                    </View>
                  )}
                </View>
                {tieneConexion ? (
                  <View style={s.afinidadPill}>
                    <Ionicons name="sparkles" size={13} color="#FD297B" />
                    <Text style={s.afinidadPillText}>{afinidad!.resumen}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.divider} />

              {/* Bio */}
              {profile.bio ? (
                <View style={s.section}>
                  <SectionLabel icon="chatbubble-ellipses-outline" text="Sobre mí" />
                  <Text style={s.bioText}>{profile.bio}</Text>
                </View>
              ) : null}

              {/* Información */}
              {infoItems.length > 0 ? (
                <View style={s.section}>
                  <SectionLabel icon="person-circle-outline" text="Información" />
                  {infoItems.map((item, i) => (
                    <View key={i} style={s.infoRow}>
                      <View style={s.infoIconCircle}>
                        <Ionicons name={item.icon} size={15} color="#FD297B" />
                      </View>
                      <Text style={s.infoRowText} numberOfLines={2}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Intereses */}
              {profile.interests && profile.interests.length > 0 ? (
                <View style={s.section}>
                  <SectionLabel icon="heart-outline" text="Intereses" />
                  <View style={s.chipsWrap}>
                    {profile.interests.map((item, idx) => (
                      <View key={idx} style={s.chip}>
                        {item.icon ? <Ionicons name={item.icon as any} size={12} color="#FD297B" /> : null}
                        <Text style={s.chipText}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Galería */}
              {profile.photos && profile.photos.length > 0 ? (
                <View style={s.section}>
                  <SectionLabel icon="images-outline" text="Galería" />
                  <View style={s.galleryGrid}>
                    {profile.photos.map((ph, idx) => (
                      <View key={idx} style={s.galleryCell}>
                        <Image source={{ uri: ph.url }} style={s.galleryImg} resizeMode="cover" />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

            </View>
          </ScrollView>

          {/* ─── BOTONES FIJOS ─── */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.93)', '#fff']}
            style={s.footerGrad}
            pointerEvents="none"
          />
          <View style={s.footerRow}>
            <TouchableOpacity style={s.passBtn} onPress={onPass} activeOpacity={0.85}>
              <Ionicons name="close" size={28} color="#FF4458" />
            </TouchableOpacity>
            <TouchableOpacity style={s.likeWrap} onPress={onLike} activeOpacity={0.85}>
              <LinearGradient
                colors={['#FD297B', '#FF655B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.likeBtnGrad}
              >
                <Ionicons name="heart" size={22} color="#fff" />
                <Text style={s.likeBtnLabel}>Me gusta</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

function SectionLabel({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.sectionLabelRow}>
      <Ionicons name={icon} size={15} color="#FD297B" />
      <Text style={s.sectionLabelText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#F7F5FA',
    height: H * 0.92,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    left: W / 2 - 22,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* HERO */
  hero: {
    width: '100%',
    height: HERO_H,
    backgroundColor: '#CCC',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroInfo: {
    position: 'absolute',
    bottom: CARD_RADIUS + 20,
    left: 20,
    right: 20,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  heroName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroAge: {
    fontSize: 26,
    fontWeight: '400',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  verifiedIcon: {
    marginLeft: 6,
    marginBottom: 2,
  },
  heroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  heroLocText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },

  /* CARD */
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    marginTop: -CARD_RADIUS,
    paddingBottom: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: '#FD297B',
    overflow: 'hidden',
    backgroundColor: '#EEE',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  afinidadPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(253,41,123,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(253,41,123,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  afinidadPillText: {
    fontSize: 12,
    color: '#FD297B',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EDF5',
    marginHorizontal: 20,
    marginTop: 16,
  },

  /* SECCIONES */
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B0F1A',
    letterSpacing: 0.15,
  },
  bioText: {
    fontSize: 15,
    color: 'rgba(11,15,26,0.72)',
    lineHeight: 23,
  },

  /* INFO */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7F5FA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(253,41,123,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowText: {
    fontSize: 14,
    color: '#0B0F1A',
    fontWeight: '500',
    flex: 1,
  },

  /* CHIPS */
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(253,41,123,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(253,41,123,0.2)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FD297B',
  },

  /* GALERÍA */
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  galleryCell: {
    width: COL,
    height: COL,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EEE',
  },
  galleryImg: {
    width: '100%',
    height: '100%',
  },

  /* FOOTER */
  footerGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  footerRow: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FF4458',
    boxShadow: boxShadow('#FF4458', 4, 12, 0.12),
  },
  likeWrap: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: boxShadow('#FD297B', 4, 16, 0.28),
  },
  likeBtnGrad: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  likeBtnLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
