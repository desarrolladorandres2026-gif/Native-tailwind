import React, { useRef, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, Animated,
  PanResponder, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import { UserProfile } from '../../components/types/index';
import { getAge, getDistance } from '../../components/utils/age';
import { boxShadow } from '../utils/shadow';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.3;
const ROTATION_RANGE  = 15;

interface Props {
  profile:     UserProfile;
  onSwipe:     (direction: 'like' | 'dislike') => void;
  isTop:       boolean;
  stackIndex?: number;   // 0 = top, 1 = middle, 2 = back
  userLat?:    number | null;
  userLon?:    number | null;
  onPress?:    () => void;
}

const SwipeCard: React.FC<Props> = ({
  profile, onSwipe, isTop, stackIndex = 0, userLat, userLon, onPress,
}) => {
  const pan    = useRef(new Animated.ValueXY()).current;
  const likeOp = useRef(new Animated.Value(0)).current;
  const nopeOp = useRef(new Animated.Value(0)).current;

  // Entrance animation (top card only)
  const mountOpacity = useRef(new Animated.Value(isTop ? 0 : 1)).current;
  const mountScale   = useRef(new Animated.Value(isTop ? 0.88 : 1)).current;

  // Haptic guards — must be refs so closure sees updates
  const hapticLikeFired = useRef(false);
  const hapticNopeFired = useRef(false);

  useEffect(() => {
    if (!isTop) return;
    Animated.parallel([
      Animated.timing(mountOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.spring(mountScale,   { toValue: 1, tension: 55, friction: 9, useNativeDriver: false }),
    ]).start();
  }, []);

  const rotate = pan.x.interpolate({
    inputRange:  [-W / 2, 0, W / 2],
    outputRange: [`-${ROTATION_RANGE}deg`, '0deg', `${ROTATION_RANGE}deg`],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder:  () => isTop,
      onPanResponderMove: (_, { dx, dy }) => {
        pan.setValue({ x: dx, y: dy });
        likeOp.setValue(dx > 0 ? Math.min(dx / 100, 1) : 0);
        nopeOp.setValue(dx < 0 ? Math.min(-dx / 100, 1) : 0);

        // Haptic tick when crossing threshold
        if (dx > SWIPE_THRESHOLD && !hapticLikeFired.current) {
          hapticLikeFired.current = true;
          hapticNopeFired.current = false;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (dx < -SWIPE_THRESHOLD && !hapticNopeFired.current) {
          hapticNopeFired.current = true;
          hapticLikeFired.current = false;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (Math.abs(dx) < SWIPE_THRESHOLD) {
          hapticLikeFired.current = false;
          hapticNopeFired.current = false;
        }
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && onPress) { onPress(); }
        if (dx > SWIPE_THRESHOLD)       { flyOut('like'); }
        else if (dx < -SWIPE_THRESHOLD) { flyOut('dislike'); }
        else {
          Animated.spring(pan,    { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          Animated.spring(likeOp, { toValue: 0,              useNativeDriver: false }).start();
          Animated.spring(nopeOp, { toValue: 0,              useNativeDriver: false }).start();
          hapticLikeFired.current = false;
          hapticNopeFired.current = false;
        }
      },
    })
  ).current;

  const flyOut = (direction: 'like' | 'dislike') => {
    Haptics.impactAsync(
      direction === 'like'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
    Animated.timing(pan, {
      toValue:  { x: direction === 'like' ? W * 1.5 : -W * 1.5, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => onSwipe(direction));
  };

  const age      = getAge(profile.birth_date);
  const distance = getDistance(userLat ?? null, userLon ?? null, profile.latitude, profile.longitude);

  const mainPhotoUri = typeof profile.profile_picture === 'string'
    ? profile.profile_picture
    : (profile.profile_picture as any)?.url;
  const allPhotos: string[] = [];
  if (mainPhotoUri) allPhotos.push(mainPhotoUri);
  (profile.photos ?? []).forEach(p => { if (p.url && p.url !== mainPhotoUri) allPhotos.push(p.url); });
  const currentPhoto = allPhotos[0] || 'https://via.placeholder.com/600';

  const interests  = (profile.interests ?? []).slice(0, 3);
  const bioSnippet = profile.bio
    ? profile.bio.slice(0, 70) + (profile.bio.length > 70 ? '…' : '')
    : null;
  const afinidad = profile.afinidad;

  const bgScale   = 1 - (stackIndex * 0.038);
  const bgOffsetY = -(stackIndex * 12);

  const cardTransform = isTop
    ? [{ translateX: pan.x }, { translateY: pan.y }, { rotate }, { scale: mountScale }]
    : [{ scale: bgScale }, { translateY: bgOffsetY }];

  return (
    <Animated.View
      style={[s.card, { opacity: mountOpacity, transform: cardTransform as any }]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: currentPhoto }} style={s.image} />

      {/* Top scrim para legibilidad de badges */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.10)', 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120 }}
        pointerEvents="none"
      />

      {/* Overlay verde al deslizar a derecha */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, {
          borderRadius:    28,
          backgroundColor: 'rgba(52,199,89,0.25)',
          opacity:         likeOp,
        }]}
      />
      {/* Overlay rojo al deslizar a izquierda */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, {
          borderRadius:    28,
          backgroundColor: 'rgba(255,59,48,0.25)',
          opacity:         nopeOp,
        }]}
      />

      {/* Barra de progreso de fotos — más premium que puntos */}
      {allPhotos.length > 1 && (
        <View style={s.photoBarRow}>
          {allPhotos.map((_, i) => (
            <View
              key={i}
              style={[
                s.photoBar,
                i === 0 ? s.photoBarActive : s.photoBarInactive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Afinidad badge */}
      {afinidad && afinidad.score > 0 && (
        <View style={s.afinidadBadge}>
          <Zap size={11} color="#FFD700" fill="#FFD700" />
          <Text style={s.afinidadText}>{afinidad.score}%</Text>
        </View>
      )}

      {/* Gradiente principal: oscuro con tinte púrpura profundo */}
      <LinearGradient
        colors={['transparent', 'rgba(5,2,18,0.42)', 'rgba(8,3,24,0.97)']}
        style={[s.overlay, { height: '76%' }]}
      />

      <View style={s.content}>
        <View style={s.nameRow}>
          <Text style={s.name}>{profile.first_name}, {age}</Text>
          {profile.is_verified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
            </View>
          )}
        </View>
        <View style={s.infoRow}>
          <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.80)" />
          <Text style={s.info}>{distance} km · {profile.ciudad || 'Desconocido'}</Text>
        </View>
        {bioSnippet ? <Text style={s.bio}>{bioSnippet}</Text> : null}
        {interests.length > 0 && (
          <View style={s.interestRow}>
            {interests.map((it, i) => (
              <View key={i} style={s.interestChip}>
                <Text style={s.interestText}>{it.icon} {it.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Badge LIKE */}
      <Animated.View style={[s.badge, s.likeBadge, { opacity: likeOp }]}>
        <Text style={[s.badgeText, s.likeBadgeText]}>LIKE</Text>
      </Animated.View>
      {/* Badge NOPE */}
      <Animated.View style={[s.badge, s.nopeBadge, { opacity: nopeOp }]}>
        <Text style={[s.badgeText, s.nopeBadgeText]}>NOPE</Text>
      </Animated.View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  card: {
    width:           W - 20,
    height:          H * 0.68,
    borderRadius:    28,
    position:        'absolute',
    backgroundColor: '#09061a',
    overflow:        'hidden',
    boxShadow:       boxShadow('#8B5CF6', 14, 28, 0.38),
  },
  image:   { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },

  photoBarRow: {
    position:       'absolute',
    top:            14,
    left:           12,
    right:          12,
    flexDirection:  'row',
    gap:            4,
    zIndex:         5,
  },
  photoBar:        { flex: 1, height: 3, borderRadius: 2 },
  photoBarActive:  { backgroundColor: 'rgba(255,255,255,0.95)' },
  photoBarInactive: { backgroundColor: 'rgba(255,255,255,0.32)' },

  afinidadBadge: {
    position:          'absolute',
    top:               26,
    right:             16,
    backgroundColor:   'rgba(255,213,0,0.16)',
    borderWidth:       1.5,
    borderColor:       'rgba(255,213,0,0.60)',
    borderRadius:      22,
    paddingHorizontal: 11,
    paddingVertical:   6,
    zIndex:            5,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
  },
  afinidadText: { color: '#FFD700', fontSize: 12, fontWeight: '800' },

  content:     { position: 'absolute', bottom: 24, left: 18, right: 18 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name:        { fontSize: 30, fontWeight: '900', color: 'white', letterSpacing: -0.8 },
  verifiedBadge: { marginTop: 1 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7 },
  info:        { fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: '600' },
  bio: {
    fontSize:     13,
    color:        'rgba(255,255,255,0.72)',
    fontWeight:   '500',
    marginBottom: 10,
    lineHeight:   18,
  },
  interestRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  interestChip: {
    backgroundColor:   'rgba(139,92,246,0.18)',
    borderRadius:      22,
    paddingHorizontal: 11,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       'rgba(139,92,246,0.45)',
  },
  interestText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700' },

  badge: {
    position:          'absolute',
    top:               64,
    paddingHorizontal: 16,
    paddingVertical:   6,
    borderRadius:      14,
    borderWidth:       4,
  },
  likeBadge: {
    left:          28,
    borderColor:   '#34C759',
    transform:     [{ rotate: '-24deg' }],
    boxShadow:     boxShadow('#34C759', 0, 14, 0.65),
  },
  nopeBadge: {
    right:         28,
    borderColor:   '#FF3B30',
    transform:     [{ rotate: '24deg' }],
    boxShadow:     boxShadow('#FF3B30', 0, 14, 0.65),
  },
  badgeText:     { fontSize: 40, fontWeight: '900' },
  likeBadgeText: { color: '#34C759' },
  nopeBadgeText: { color: '#FF3B30' },
});

export default SwipeCard;
