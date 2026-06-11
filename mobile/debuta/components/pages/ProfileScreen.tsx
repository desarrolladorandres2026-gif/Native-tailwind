import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, TextInput, Animated,
  Dimensions, Platform, StatusBar, Modal,
  Alert, Switch,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useProfile, UserProfile } from '../../hooks/useProfile';
import FloatingHearts from '../ui/FloatingHearts';
import BadgesSection from '../profile/BadgesSection';
import { boxShadow } from '../utils/shadow';
import { useTheme } from '../../theme/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');

const BUSCANDO_OPTIONS = [
  { id: 'amistad', label: 'Amistad', icon: 'account-group' },
  { id: 'citas', label: 'Citas', icon: 'heart-outline' },
  { id: 'serio', label: 'Relación seria', icon: 'ring' },
  { id: 'casual', label: 'Algo casual', icon: 'fire' },
  { id: 'no_lo_se', label: 'No lo sé aún', icon: 'help-circle-outline' },
];

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const {
    profile, stats, loading, saving, completion, fetchProfile,
    updateProfile, uploadAvatar, uploadCoverPhoto,
    removeAvatar, removeCoverPhoto,
  } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<UserProfile>>({});
  
  // Vista previa de imagen
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'avatar' | 'cover' | null>(null);
  
  // Animaciones
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (profile) {
      setEditedData({
        bio: profile.bio || '',
        job_title: profile.job_title || '',
        company: profile.company || '',
        education: profile.education || '',
        relationship_status: profile.relationship_status || '',
        buscando: profile.buscando || '',
        religion: profile.religion || '',
        zodiac: profile.zodiac || '',
        smoke: profile.smoke || '',
        drink: profile.drink || '',
        exercise: profile.exercise || '',
        height: profile.height,
        settings: profile.settings || {},
      });
    }
  }, [profile]);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile(editedData);
    setIsEditing(false);
  };

  const handlePickAvatar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri);
      setPreviewUri(null);
    }
  };

  const handlePickCover = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadCoverPhoto(result.assets[0].uri);
      setPreviewUri(null);
    }
  };

  const handleRemoveMedia = async () => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            if (previewType === 'avatar') await removeAvatar();
            else if (previewType === 'cover') await removeCoverPhoto();
            setPreviewUri(null);
          }
        }
      ]
    );
  };

  const togglePrivacy = (key: keyof NonNullable<NonNullable<UserProfile['settings']>['privacy']>) => {
    const currentPrivacy = editedData.settings?.privacy || {};
    setEditedData({
      ...editedData,
      settings: {
        ...editedData.settings,
        privacy: {
          ...currentPrivacy,
          [key]: !currentPrivacy[key]
        }
      }
    });
  };

  if (loading && !profile) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg[0] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const coverScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  const renderInfoItem = (icon: string, label: string, key: keyof UserProfile, privacyKey?: any) => {
    const value = editedData[key] as string;
    if (!value && !isEditing) return null;
    const isVisible = privacyKey ? (editedData.settings?.privacy as any)?.[privacyKey] !== false : true;

    return (
      <View style={s.infoItem}>
        <View style={[s.infoIconBg, { backgroundColor: `${colors.primary}15` }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
        </View>
        <View style={s.infoContent}>
          <Text style={[s.infoLabel, { color: colors.textLight }]}>{label}</Text>
          {isEditing ? (
            <TextInput
              style={[s.infoInput, { color: colors.text, borderBottomColor: colors.glassBorder }]}
              value={value || ''}
              onChangeText={(txt) => setEditedData({ ...editedData, [key]: txt })}
              placeholder={`Añadir ${label.toLowerCase()}...`}
              placeholderTextColor={colors.textLight}
            />
          ) : (
            <Text style={[s.infoValue, { color: colors.textDim }]}>{value || 'No especificado'}</Text>
          )}
        </View>
        {isEditing && privacyKey && (
          <TouchableOpacity onPress={() => togglePrivacy(privacyKey)} style={s.privacyToggle}>
            <Ionicons 
              name={isVisible ? "eye-outline" : "eye-off-outline"} 
              size={20} 
              color={isVisible ? colors.primary : colors.textLight} 
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Fondo Premium */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={colors.bg} style={StyleSheet.absoluteFillObject} />
        <View style={[s.bgBlob, { top: 200, right: -50, backgroundColor: colors.secondary, opacity: isDark ? 0.15 : 0.2 }]} />
        <FloatingHearts />
      </View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Header / Cover */}
        <View style={s.headerContainer}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => {
              setPreviewUri(profile?.cover_photo?.url || 'https://images.unsplash.com/photo-1518196775741-201b3194c5f2?q=80&w=1000&auto=format&fit=crop');
              setPreviewType('cover');
            }}
          >
            <Animated.Image 
              source={{ uri: profile?.cover_photo?.url || 'https://images.unsplash.com/photo-1518196775741-201b3194c5f2?q=80&w=1000&auto=format&fit=crop' }} 
              style={[s.cover, { transform: [{ scale: coverScale }] }]} 
            />
          </TouchableOpacity>
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.4)']} style={s.coverOverlay} pointerEvents="none" />
          
          <View style={s.headerActions}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Mi Perfil</Text>
            <TouchableOpacity style={s.settingsBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.editCoverBtn} onPress={handlePickCover}>
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={[s.glassCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={s.avatarWrapper}>
            <TouchableOpacity 
              onPress={() => {
                setPreviewUri(profile?.profile_picture?.url || 'https://via.placeholder.com/150');
                setPreviewType('avatar');
              }} 
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary, colors.tertiary]}
                style={s.avatarGradientRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[s.avatarInner, { backgroundColor: colors.card }]}>
                  <Image
                    source={{ uri: profile?.profile_picture?.url || 'https://via.placeholder.com/150' }}
                    style={s.avatar}
                  />
                </View>
              </LinearGradient>
              <TouchableOpacity style={s.editAvatarBadge} onPress={handlePickAvatar}>
                <LinearGradient colors={[colors.primary, colors.secondary]} style={[s.editAvatarBadgeGradient, { borderColor: colors.card }]}>
                  <Ionicons name="camera" size={14} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          <View style={s.profileHeader}>
            <View style={s.nameRow}>
              <Text style={[s.name, { color: colors.text }]}>{profile?.first_name} {profile?.last_name}</Text>
              {profile?.is_verified && <Ionicons name="checkmark-circle" size={22} color={colors.tertiary} />}
            </View>
            <Text style={[s.username, { color: colors.textLight }]}>@{profile?.username || 'usuario'}</Text>
          </View>

          <View style={[s.statsRow, { backgroundColor: `${colors.text}05`, borderColor: `${colors.text}10` }]}>
            <View style={s.statItem}>
              <View style={s.statValueRow}>
                <Ionicons name="heart" size={17} color={colors.primary} />
                <Text style={[s.statValue, { color: colors.primary }]}>{stats?.matches || 0}</Text>
              </View>
              <Text style={[s.statLabel, { color: colors.textLight }]}>Matches</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: `${colors.text}15` }]} />
            <View style={s.statItem}>
              <View style={s.statValueRow}>
                <Ionicons name="star" size={17} color={colors.secondary} />
                <Text style={[s.statValue, { color: colors.secondary }]}>{stats?.likesGiven || 0}</Text>
              </View>
              <Text style={[s.statLabel, { color: colors.textLight }]}>Likes dados</Text>
            </View>
          </View>

          {/* Buscando Section */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>¿Qué estoy buscando?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.buscandoScroll}>
              {BUSCANDO_OPTIONS.map((opt) => {
                const isSelected = editedData.buscando === opt.id;
                return (
                  <TouchableOpacity 
                    key={opt.id} 
                    disabled={!isEditing}
                    onPress={() => setEditedData({ ...editedData, buscando: opt.id })}
                    style={[s.buscandoBadge, { backgroundColor: colors.card, borderColor: colors.glassBorder }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <MaterialCommunityIcons 
                      name={opt.icon as any} 
                      size={18} 
                      color={isSelected ? 'white' : colors.textDim} 
                    />
                    <Text style={[s.buscandoText, { color: colors.textDim }, isSelected && { color: 'white' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Sobre mí</Text>
              <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
                <LinearGradient colors={[colors.primary, colors.secondary]} start={{x:0, y:0}} end={{x:1, y:0}} style={s.editBtnGradient}>
                  <Text style={s.editBtnText}>
                    {isEditing ? 'Guardar' : 'Editar Perfil'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {isEditing ? (
              <TextInput
                style={[s.bioInput, { color: colors.text, backgroundColor: `${colors.text}08` }]}
                value={editedData.bio}
                onChangeText={(bio) => setEditedData({ ...editedData, bio })}
                multiline
                placeholder="Cuéntanos algo interesante sobre ti..."
                placeholderTextColor={colors.textLight}
              />
            ) : (
              <Text style={[s.bioText, { color: colors.textDim }]}>
                {profile?.bio || '¡Añade una biografía para que otros te conozcan mejor!'}
              </Text>
            )}
          </View>

          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Información Personal</Text>
            <View style={s.infoGrid}>
              {renderInfoItem('briefcase-outline', 'Trabajo', 'job_title', 'show_job')}
              {renderInfoItem('office-building', 'Empresa', 'company', 'show_job')}
              {renderInfoItem('school-outline', 'Estudios', 'education', 'show_education')}
              {renderInfoItem('heart-multiple-outline', 'Relación', 'relationship_status', 'show_relationship')}
              {renderInfoItem('church', 'Religión', 'religion', 'show_personal_info')}
              {renderInfoItem('zodiac-cancer', 'Zodiaco', 'zodiac', 'show_personal_info')}
              {renderInfoItem('cigar', 'Fuma', 'smoke', 'show_personal_info')}
              {renderInfoItem('glass-wine', 'Bebe', 'drink', 'show_personal_info')}
              {renderInfoItem('dumbbell', 'Ejercicio', 'exercise', 'show_personal_info')}
            </View>
          </View>

          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Intereses</Text>
            <View style={s.interestsRow}>
              {profile?.interests?.length ? profile.interests.map((it: any, i: number) => (
                <View key={i} style={[s.interestBadge, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                  <Text style={[s.interestText, { color: colors.textDim }]}>{it.name}</Text>
                </View>
              )) : (
                <Text style={[s.emptyText, { color: colors.textLight }]}>No has seleccionado intereses.</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Logros / Badges ── */}
        <BadgesSection
          matchCount={stats.matches ?? 0}
          profileCompletion={completion.percentage}
          hasConfirmedDate={false}
          createdAt={profile?.createdAt}
        />

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Modal de Vista Previa */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={s.modalRoot}>
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />
          
          <TouchableOpacity style={s.modalClose} onPress={() => setPreviewUri(null)}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          <View style={previewType === 'avatar' ? s.modalContentAvatar : s.modalContentCover}>
            {previewUri && (
              <Image 
                source={{ uri: previewUri }} 
                style={previewType === 'avatar' ? s.modalAvatar : s.modalCover} 
                resizeMode="cover" 
              />
            )}
          </View>

          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalActionBtn} onPress={previewType === 'avatar' ? handlePickAvatar : handlePickCover}>
              <Ionicons name="refresh" size={24} color="white" />
              <Text style={s.modalActionText}>Actualizar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.modalActionBtn, s.modalActionDestructive]} onPress={handleRemoveMedia}>
              <Ionicons name="trash-outline" size={24} color="white" />
              <Text style={s.modalActionText}>Eliminar</Text>
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
  bgBlob: { position: 'absolute', width: 400, height: 400, borderRadius: 200 },
  
  headerContainer: { height: 280, width: '100%' },
  cover: { width: '100%', height: '100%' },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  headerActions: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 60 : 40, 
    left: 20, 
    right: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  editCoverBtn: { position: 'absolute', bottom: 60, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },

  glassCard: { 
    marginTop: -40, 
    marginHorizontal: 15, 
    borderRadius: 40, 
    padding: 25,
    borderWidth: 1,
    boxShadow: boxShadow('#000', 15, 30, 0.1),
    marginBottom: 20,
  },
  avatarWrapper: { alignItems: 'center', marginTop: -75 },
  avatarGradientRing: {
    padding:       3,
    borderRadius:  67,
    boxShadow:     boxShadow('#8B5CF6', 8, 18, 0.45),
  },
  avatarInner: {
    padding:      5,
    borderRadius: 64,
    overflow:     'hidden',
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  editAvatarBadge: { position: 'absolute', bottom: 5, right: 5 },
  editAvatarBadgeGradient: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  
  profileHeader: { alignItems: 'center', marginTop: 15 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 28, fontWeight: '900' },
  username: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  
  statsRow: { 
    flexDirection: 'row', 
    marginTop: 25, 
    borderRadius: 25, 
    paddingVertical: 20,
    borderWidth: 1,
  },
  statItem:     { flex: 1, alignItems: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDivider:  { width: 1, height: '50%', alignSelf: 'center' },
  statValue:    { fontSize: 24, fontWeight: '900' },
  statLabel:    { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 3, letterSpacing: 1 },
  
  section: { marginTop: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  
  editBtnGradient: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  editBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },

  bioText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  bioInput: { fontSize: 16, borderRadius: 20, padding: 16, minHeight: 120, textAlignVertical: 'top', fontWeight: '500' },
  
  buscandoScroll: { paddingBottom: 10 },
  buscandoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, gap: 8 },
  buscandoText: { fontSize: 14, fontWeight: '700' },

  infoGrid: { marginTop: 5 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 12 },
  infoIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 16, fontWeight: '600' },
  infoInput: { fontSize: 16, fontWeight: '600', borderBottomWidth: 1, paddingVertical: 2 },
  privacyToggle: { padding: 5 },

  interestsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  interestBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, borderWidth: 1 },
  interestText: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },

  // Modal Styles
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  modalContentAvatar: { width: W * 0.85, height: W * 0.85, justifyContent: 'center', alignItems: 'center' },
  modalContentCover: { width: W * 0.95, height: W * 0.95 * (9 / 16), justifyContent: 'center', alignItems: 'center' },
  modalAvatar: { width: W * 0.8, height: W * 0.8, borderRadius: W * 0.4 },
  modalCover: { width: W * 0.95, height: W * 0.95 * (9 / 16), borderRadius: 24 },
  modalActions: { flexDirection: 'row', gap: 20, marginTop: 40 },
  modalActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  modalActionDestructive: { backgroundColor: 'rgba(255,0,0,0.3)', borderColor: 'rgba(255,0,0,0.5)' },
  modalActionText: { color: 'white', fontWeight: '800', fontSize: 16 },
});