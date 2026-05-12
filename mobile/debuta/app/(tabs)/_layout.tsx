import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

function TabIcon({
  name, focused, badge, colors
}: {
  name: string; focused: boolean; badge?: number; colors: any;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name={name as any}
        size={24}
        color={focused ? colors.primary : colors.textLight}
      />
      {badge != null && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor:  colors.card,
          borderTopColor:   colors.glassBorder,
          borderTopWidth:   1,
          height:           Platform.OS === 'ios' ? 88 : 70,
          paddingBottom:    Platform.OS === 'ios' ? 30 : 10,
          paddingTop:       6,
          elevation:        0,
          shadowOpacity:    0,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:    'Descubrir',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title:    'Likes',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title:    'Chats',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:    'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title:    'Ajustes',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="Chat"
        options={{ href: null }}
      />
    </Tabs>
  );
}

import { Platform } from 'react-native';

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});