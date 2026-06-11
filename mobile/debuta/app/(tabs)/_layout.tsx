import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

function TabIcon({
  name, focused, badge, colors, isDark,
}: {
  name: string; focused: boolean; badge?: number; colors: any; isDark: boolean;
}) {
  const scale  = useRef(new Animated.Value(1)).current;
  const glowOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,  { toValue: focused ? 1.18 : 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(glowOp, { toValue: focused ? 1 : 0,    duration: 220,          useNativeDriver: true }),
    ]).start();
  }, [focused]);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 38 }}>
      {/* Glow de fondo cuando está activo */}
      <Animated.View style={[styles.iconGlow, { backgroundColor: `${colors.primary}22`, opacity: glowOp }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={name as any}
          size={24}
          color={focused ? colors.primary : colors.textLight}
        />
      </Animated.View>
      {/* Punto indicador activo debajo del ícono */}
      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: colors.primary, opacity: glowOp },
        ]}
      />
      {badge != null && badge > 0 && (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={[styles.badge, { borderColor: isDark ? '#050505' : '#FFFFFF' }]}
        >
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  const gradientBorder = isDark
    ? ['rgba(139,92,246,0.55)', 'rgba(217,70,239,0.28)', 'rgba(139,92,246,0.55)'] as const
    : ['rgba(253,41,123,0.35)', 'rgba(255,101,91,0.18)', 'rgba(253,41,123,0.35)'] as const;

  const gradientOverlay = isDark
    ? ['rgba(139,92,246,0.08)', 'transparent'] as const
    : ['rgba(253,41,123,0.05)', 'transparent'] as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth:  0,
          height:          Platform.OS === 'ios' ? 88 : 70,
          paddingBottom:   Platform.OS === 'ios' ? 30 : 10,
          paddingTop:      6,
          elevation:       0,
          boxShadow:       'none',
        },
        tabBarBackground: () => (
          <>
            <BlurView
              intensity={isDark ? 90 : 75}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={gradientOverlay}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={gradientBorder}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </>
        ),
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Descubrir',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} colors={colors} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} colors={colors} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} colors={colors} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} colors={colors} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} colors={colors} isDark={isDark} />
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

const styles = StyleSheet.create({
  iconGlow: {
    position:     'absolute',
    top:          0,
    width:        44,
    height:       32,
    borderRadius: 16,
  },
  activeDot: {
    width:        5,
    height:       5,
    borderRadius: 2.5,
    marginTop:    3,
  },
  badge: {
    position:          'absolute',
    top:               -5,
    right:             -9,
    borderRadius:      9,
    minWidth:          18,
    height:            18,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 4,
    borderWidth:       2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
