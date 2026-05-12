import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../types';
import { getAge } from '../utils/age';

interface Props {
  match: Match;
  onPress: () => void;
}

const MatchCard: React.FC<Props> = ({ match, onPress }) => {
  const { matched_user: user, last_message, unread_count = 0, created_at } = match;
  const age = getAge(user.birth_date);
  const photo = typeof user.profile_picture === 'object' && user.profile_picture !== null ? user.profile_picture.url : user.profile_picture;

  const timeLabel = (() => {
    const d = new Date(last_message?.created_at || created_at);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  })();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75} testID="match-card-touchable">
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} testID="match-card-image" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} testID="match-card-placeholder">
            <Ionicons name="person" size={26} color="rgba(45,27,61,0.38)" />
          </View>
        )}
        {unread_count > 0 && (
          <View style={styles.badge} testID="match-card-badge">
            <Text style={styles.badgeText}>
              {unread_count > 9 ? '9+' : unread_count}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name}>
            {user.first_name || user.username}
            {age ? `, ${age}` : ''}
          </Text>
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {last_message
            ? last_message.content
            : '¡Nuevo match! Di hola 👋'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(205,180,219,0.22)',
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#E8DEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e8659a',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF0F8',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  info: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: '#2d1b3d',
    fontSize: 15,
    fontWeight: '600',
  },
  time: {
    color: 'rgba(45,27,61,0.28)',
    fontSize: 12,
  },
  preview: {
    color: 'rgba(45,27,61,0.42)',
    fontSize: 13,
  },
});

export default MatchCard;
