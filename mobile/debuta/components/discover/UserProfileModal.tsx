import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Image, ScrollView, Dimensions, Animated, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types';
import { getAge } from '../utils/age';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  single:          'Soltero/a',
  in_relationship: 'En una relación',
  married:         'Casado/a',
  complicated:     'Es complicado',
  prefer_not_say:  'Prefiero no decir',
};

export default function UserProfileModal({ visible, profile, onClose, onLike, onPass }: Props) {
  if (!profile) return null;

  const age = getAge(profile.birth_date);
  const avatarUrl = typeof profile.profile_picture === 'object' && profile.profile_picture !== null 
    ? profile.profile_picture.url 
    : (profile.profile_picture ?? null);
  const coverUrl = profile.cover_photo?.url ?? null;

  // Afinidad
  const afinidad = profile.afinidad;
  const tieneConexion = afinidad && afinidad.score > 0 && afinidad.resumen;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          
          {/* Botón Cerrar Flotante */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            
            {/* ══════════════════════════════════════════
                COVER & AVATAR
            ══════════════════════════════════════════ */}
            <View style={s.coverWrap}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={s.coverImage} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={['#FD297B', '#FF5864', '#FF655B']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.95)']}
                style={[StyleSheet.absoluteFill, { top: '50%' }]}
              />
            </View>

            <View style={s.headerSection}>
              <View style={s.avatarArea}>
                <View style={s.avatarRing}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarPlaceholder]}>
                      <Ionicons name="person" size={44} color="rgba(45,27,61,0.25)" />
                    </View>
                  )}
                </View>
                {profile.is_verified && (
                  <View style={s.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#0084FF" />
                  </View>
                )}
              </View>

              {/* Nombre y datos */}
              <View style={s.nameWrap}>
                <Text style={s.nameText}>
                  {profile.first_name || profile.username}
                  {age ? <Text style={s.ageText}>, {age}</Text> : null}
                </Text>
                {profile.location_label || profile.ciudad ? (
                  <View style={s.locationRow}>
                    <Ionicons name="location" size={14} color="#FD297B" />
                    <Text style={s.locationText}>
                      {profile.location_label || profile.ciudad}
                    </Text>
                  </View>
                ) : null}
              </View>
              
              {/* Afinidad */}
              {tieneConexion && (
                <View style={s.afinidadBox}>
                  <Ionicons name="sparkles" size={16} color="#FF6B8A" />
                  <Text style={s.afinidadText}>{afinidad!.resumen}</Text>
                </View>
              )}
            </View>

            {/* ══════════════════════════════════════════
                BIO
            ══════════════════════════════════════════ */}
            {profile.bio ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Sobre mí</Text>
                <Text style={s.bioText}>{profile.bio}</Text>
              </View>
            ) : null}

            {/* ══════════════════════════════════════════
                INFO PERSONAL
            ══════════════════════════════════════════ */}
            {(profile.job_title || profile.company || profile.education || profile.relationship_status) && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Información</Text>
                
                {(profile.job_title || profile.company) && (
                  <InfoRow icon="briefcase-outline">
                    {profile.job_title && profile.company ? `${profile.job_title} en ${profile.company}` : profile.job_title || profile.company}
                  </InfoRow>
                )}
                
                {profile.education && (
                  <InfoRow icon="school-outline">{profile.education}</InfoRow>
                )}
                
                {profile.relationship_status && (
                  <InfoRow icon="heart-outline">{RELATIONSHIP_LABELS[profile.relationship_status] || profile.relationship_status}</InfoRow>
                )}
              </View>
            )}

            {/* ══════════════════════════════════════════
                INTERESES
            ══════════════════════════════════════════ */}
            {profile.interests && profile.interests.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Intereses</Text>
                <View style={s.chipsWrap}>
                  {profile.interests.map((item, idx) => (
                    <View key={idx} style={s.chip}>
                      {item.icon ? <Ionicons name={item.icon as any} size={14} color="#FD297B" /> : null}
                      <Text style={s.chipText}>{item.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ══════════════════════════════════════════
                GALERÍA
            ══════════════════════════════════════════ */}
            {profile.photos && profile.photos.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Galería</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galleryContainer}>
                  {profile.photos.map((ph, idx) => (
                    <View key={idx} style={s.galleryImgWrap}>
                      <Image source={{ uri: ph.url }} style={s.galleryImg} resizeMode="cover" />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
          </ScrollView>

          {/* ══════════════════════════════════════════
              BOTONES FLOTANTES
          ══════════════════════════════════════════ */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.9)', '#FFFFFF']}
            style={s.footerGrad}
            pointerEvents="none"
          />
          <View style={s.footerBtns}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnNope]} onPress={onPass}>
              <Ionicons name="close" size={36} color="#FF655B" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnLike]} onPress={onLike}>
              <Ionicons name="heart" size={32} color="#45CE7B" />
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ icon, children }: { icon: any, children: React.ReactNode }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={18} color="rgba(11,15,26,0.45)" style={s.infoIcon} />
      <Text style={s.infoText}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    height: H * 0.88,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverWrap: {
    height: 260,
    width: '100%',
    backgroundColor: '#EEEEEE',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  headerSection: {
    paddingHorizontal: 20,
    marginTop: -60,
    alignItems: 'center',
  },
  avatarArea: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  nameWrap: {
    alignItems: 'center',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0B0F1A',
  },
  ageText: {
    fontWeight: '400',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(11,15,26,0.6)',
    fontWeight: '500',
  },
  afinidadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,138,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  afinidadText: {
    color: '#FD297B',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B0F1A',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 15,
    color: 'rgba(11,15,26,0.7)',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    width: 24,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(11,15,26,0.8)',
    flex: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(11,15,26,0.7)',
  },
  galleryContainer: {
    gap: 12,
    paddingRight: 24,
  },
  galleryImgWrap: {
    width: 140,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EEEEEE',
  },
  galleryImg: {
    width: '100%',
    height: '100%',
  },
  footerGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  footerBtns: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  actionBtnNope: {
    borderWidth: 1,
    borderColor: '#FF655B',
  },
  actionBtnLike: {
    borderWidth: 1,
    borderColor: '#45CE7B',
  },
});
