import React, { useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Animated,
  PanResponder, Dimensions, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProfile } from '../../components/types/index';
import { getAge, getDistance } from '../../components/utils/age';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.3;
const ROTATION_RANGE  = 15;

interface Props {
  profile: UserProfile;
  onSwipe: (direction: 'like' | 'dislike') => void;
  isTop: boolean;
  userLat?: number | null;
  userLon?: number | null;
  onPress?: () => void;
}

const SwipeCard: React.FC<Props> = ({ profile, onSwipe, isTop, userLat, userLon, onPress }) => {
  const pan      = useRef(new Animated.ValueXY()).current;
  const likeOp   = useRef(new Animated.Value(0)).current;
  const nopeOp   = useRef(new Animated.Value(0)).current;

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
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && onPress) { onPress(); }
        if (dx > SWIPE_THRESHOLD) { flyOut('like'); }
        else if (dx < -SWIPE_THRESHOLD) { flyOut('dislike'); }
        else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          Animated.spring(likeOp, { toValue: 0, useNativeDriver: false }).start();
          Animated.spring(nopeOp, { toValue: 0, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const flyOut = (direction: 'like' | 'dislike') => {
    Animated.timing(pan, {
      toValue: { x: direction === 'like' ? W * 1.5 : -W * 1.5, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => onSwipe(direction));
  };

  const age      = getAge(profile.birth_date);
  const distance = getDistance(userLat ?? null, userLon ?? null, profile.latitude, profile.longitude);
  const photoUri = typeof profile.profile_picture === 'string' 
    ? profile.profile_picture 
    : (profile.profile_picture as any)?.url;

  return (
    <Animated.View
      style={[s.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: photoUri || 'https://via.placeholder.com/600' }} style={s.image} />
      
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={s.overlay} />

      <View style={s.content}>
        <View style={s.nameRow}>
          <Text style={s.name}>{profile.first_name}, {age}</Text>
          {profile.is_verified && <Ionicons name="checkmark-circle" size={20} color="#007AFF" />}
        </View>
        <Text style={s.info}>
          <Ionicons name="location-outline" size={14} /> {distance} km · {profile.ciudad || 'Desconocido'}
        </Text>
      </View>

      <Animated.View style={[s.badge, s.likeBadge, { opacity: likeOp }]}>
        <Text style={[s.badgeText, s.likeBadgeText]}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[s.badge, s.nopeBadge, { opacity: nopeOp }]}>
        <Text style={[s.badgeText, s.nopeBadgeText]}>NOPE</Text>
      </Animated.View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  card: { 
    width: W - 16, 
    height: H * 0.72, 
    borderRadius: 30, 
    position: 'absolute', 
    backgroundColor: '#F0F0F0', 
    overflow: 'hidden', 
    elevation: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 15,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  content: { position: 'absolute', bottom: 30, left: 20, right: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 34, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  info: { fontSize: 17, color: 'rgba(255,255,255,0.95)', fontWeight: '600', marginTop: 4 },
  badge: { position: 'absolute', top: 60, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12, borderWidth: 5 },
  likeBadge: { left: 45, borderColor: '#4CAF50', transform: [{ rotate: '-25deg' }] },
  nopeBadge: { right: 45, borderColor: '#FF5864', transform: [{ rotate: '25deg' }] },
  badgeText: { fontSize: 45, fontWeight: '900' },
  likeBadgeText: { color: '#4CAF50' },
  nopeBadgeText: { color: '#FF5864' },
});

export default SwipeCard;
