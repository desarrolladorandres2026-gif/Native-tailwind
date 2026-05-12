import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import FloatingHearts from '../ui/FloatingHearts';

const { width: W, height: H } = Dimensions.get('window');

const COLORS = {
  background: '#FFFFFF',
  gradientMain: ['#FF5864', '#FF655B', '#FD297B'] as const,
  primary: '#FD297B',
  secondary: '#FF655B',
  accentPink: 'rgba(253,41,123,0.1)',
  accentBlue: 'rgba(255,88,100,0.1)',
  text: '#1A1A1A',
  textSoft: '#666666',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  shadow: 'rgba(253, 41, 123, 0.2)',
};

const RULES = [
  {
    id: 1,
    icon: 'person-outline',
    title: 'Sé tú mismo',
    desc: 'La autenticidad es la base. Perfiles falsos o suplantación de identidad serán eliminados.',
  },
  {
    id: 2,
    icon: 'heart-outline',
    title: 'Respeto mutuo',
    desc: 'Trata a los demás con amabilidad. No toleramos acoso, odio ni discriminación.',
  },
  {
    id: 3,
    icon: 'shield-checkmark-outline',
    title: 'Seguridad primero',
    desc: 'No compartas datos sensibles. Reporta cualquier comportamiento sospechoso.',
  },
  {
    id: 4,
    icon: 'images-outline',
    title: 'Contenido apropiado',
    desc: 'Mantén tus fotos y mensajes respetuosos. Nada de contenido sexual explícito.',
  },
  {
    id: 5,
    icon: 'calendar-outline',
    title: 'Edad mínima',
    desc: 'Debes tener al menos 18 años para usar Debuta. La seguridad es nuestra prioridad.',
  },
];

export default function CommunityRulesScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAccept = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('debuta_rules_accepted', 'true');
    
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  };

  const handleDecline = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Acceso Denegado",
      "Para poder utilizar Debuta y conectar con otras personas, es obligatorio aceptar nuestras normas de convivencia y seguridad.\n\n¿Deseas volver a revisarlas?",
      [
        {
          text: "Salir",
          style: "destructive",
          onPress: () => {
            // En una app real podríamos cerrar la app, aquí simplemente mantenemos al usuario informado
          }
        },
        {
          text: "Revisar reglas",
          style: "default",
          onPress: () => {}
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Blobs */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[COLORS.accentPink, 'transparent']}
          style={[styles.bgBlob, { top: -W * 0.2, left: -W * 0.1 }]}
        />
        <LinearGradient
          colors={[COLORS.accentBlue, 'transparent']}
          style={[styles.bgBlob, { bottom: -W * 0.2, right: -W * 0.1 }]}
        />
      </View>

      <FloatingHearts />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <LinearGradient
                colors={COLORS.gradientMain}
                style={styles.headerIconGrad}
              >
                <Ionicons name="shield-half" size={40} color={COLORS.white} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Límites de la Comunidad</Text>
            <Text style={styles.subtitle}>
              Bienvenido a Debuta. Para asegurar una experiencia segura y agradable para todos, por favor acepta nuestras normas básicas.
            </Text>
          </View>

          {/* Rules List */}
          <View style={styles.rulesContainer}>
            {RULES.map((rule, index) => (
              <RuleItem key={rule.id} rule={rule} index={index} />
            ))}
          </View>

          {/* Footer Info */}
          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSoft} />
            <Text style={styles.footerNoteText}>
              Al continuar, aceptas nuestras Reglas y Términos de Servicio.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          onPress={handleAccept}
          activeOpacity={0.8}
          style={styles.acceptBtn}
        >
          <LinearGradient
            colors={COLORS.gradientMain}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.acceptBtnGrad}
          >
            <Text style={styles.acceptBtnText}>Entiendo y Acepto</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleDecline}
          activeOpacity={0.6}
          style={styles.declineBtn}
        >
          <Text style={styles.declineBtnText}>No acepto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RuleItem({ rule, index }: { rule: typeof RULES[0], index: number }) {
  return (
    <View style={styles.ruleItem}>
      <View style={styles.ruleIconContainer}>
        <Ionicons name={rule.icon as any} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.ruleTextContainer}>
        <Text style={styles.ruleTitle}>{rule.title}</Text>
        <Text style={styles.ruleDesc}>{rule.desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bgBlob: {
    position: 'absolute',
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 180,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.white,
    padding: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 20,
  },
  headerIconGrad: {
    flex: 1,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSoft,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  rulesContainer: {
    gap: 20,
  },
  ruleItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.glass,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ruleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(253, 41, 123, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ruleTextContainer: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  ruleDesc: {
    fontSize: 14,
    color: COLORS.textSoft,
    lineHeight: 20,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 8,
  },
  footerNoteText: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  acceptBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  acceptBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  declineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  declineBtnText: {
    color: COLORS.textSoft,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
