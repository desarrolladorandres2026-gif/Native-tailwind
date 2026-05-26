import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FloatingHearts from '../ui/FloatingHearts';
import { useTheme } from '../../theme/ThemeContext';

const { width: W } = Dimensions.get('window');

export default function TermsScreen() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.bg[0] }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Premium Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[`${colors.primary}10`, 'transparent']}
          style={[s.bgBlob, { top: -W * 0.2, left: -W * 0.1 }]}
        />
        <LinearGradient
          colors={[`${colors.secondary}10`, 'transparent']}
          style={[s.bgBlob, { bottom: -W * 0.2, right: -W * 0.1 }]}
        />
      </View>

      <FloatingHearts />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header Glassmorphism */}
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.glassBorder }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <View style={[s.backIconCircle, { backgroundColor: colors.bg[0], borderColor: colors.glassBorder }]}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </View>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Términos y Privacidad</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={s.scrollContent}
        >
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <Text style={[s.lastUpdate, { color: colors.textLight }]}>Última actualización: 8 de mayo, 2026</Text>

            <Section title="1. ACEPTACIÓN DE LOS TÉRMINOS" icon="document-text-outline" colors={colors}>
              <Text style={[s.paragraph, { color: colors.textDim }]}>
                Al descargar, instalar o utilizar la aplicación Debuta ("la Aplicación"), usted acepta cumplir y estar sujeto a los siguientes Términos y Condiciones de Uso. Si no está de acuerdo con estos términos, no debe utilizar la Aplicación.
              </Text>
            </Section>

            <Section title="2. ELEGIBILIDAD" icon="person-add-outline" colors={colors}>
              <Text style={[s.paragraph, { color: colors.textDim }]}>
                Para utilizar Debuta, debe tener al menos 18 años de edad. Al crear una cuenta, usted garantiza que cumple con este requisito de edad y que tiene la capacidad legal para aceptar estos términos.
              </Text>
            </Section>

            <Section title="3. DESCRIPCIÓN DEL SERVICIO" icon="flash-outline" colors={colors}>
              <Text style={[s.paragraph, { color: colors.textDim }]}>
                Debuta es una plataforma diseñada para conectar personas reales en un entorno social seguro. Los servicios incluyen la creación de perfiles, interacción mediante mensajes y sistemas de emparejamiento inteligente.
              </Text>
            </Section>

            <Section title="4. CONTENIDO GENERADO POR EL USUARIO" icon="images-outline" colors={colors}>
              <Text style={[s.paragraph, { color: colors.textDim }]}>
                Usted es el único responsable del contenido que publique. Al utilizar la aplicación, se compromete a:
              </Text>
              <BulletPoint text="No publicar contenido ilegal, obsceno o discriminatorio." colors={colors} />
              <BulletPoint text="No infringir derechos de propiedad intelectual." colors={colors} />
              <BulletPoint text="No publicar contenido sexual explícito (Tolerancia Cero)." colors={colors} />
            </Section>

            <Section title="5. SEGURIDAD Y MODERACIÓN" icon="shield-checkmark-outline" colors={colors}>
              <Text style={[s.paragraph, { color: colors.textDim }]}>
                Para garantizar un entorno seguro, implementamos las siguientes medidas:
              </Text>
              <BulletPoint text="Reportes: Puede reportar cualquier perfil o mensaje inapropiado." colors={colors} />
              <BulletPoint text="Bloqueos: Puede bloquear a cualquier usuario en cualquier momento." colors={colors} />
              <BulletPoint text="Moderación: Revisamos reportes en menos de 24 horas." colors={colors} />
            </Section>

            <Section title="6. POLÍTICA DE PRIVACIDAD" icon="lock-closed-outline" colors={colors}>
              <Text style={[s.paragraph, { color: colors.textDim }]}>
                Su privacidad es fundamental. Recopilamos y tratamos sus datos con transparencia:
              </Text>
              <Definition 
                term="Datos de Perfil" 
                desc="Nombre, correo, fecha de nacimiento y fotos necesarios para la funcionalidad." 
                colors={colors}
              />
              <Definition 
                term="Ubicación" 
                desc="Utilizamos su GPS para mostrarle usuarios cercanos y facilitar el descubrimiento." 
                colors={colors}
              />
              <Definition 
                term="Uso de Datos" 
                desc="No vendemos sus datos. Los usamos para mejorar su experiencia en la plataforma." 
                colors={colors}
              />
            </Section>

            <View style={s.footer}>
              <LinearGradient colors={[colors.primary, colors.secondary]} style={s.footerDivider} start={[0,0]} end={[1,0]} />
              <Text style={[s.footerText, { color: colors.textDim }]}>© 2026 Debuta. Todos los derechos reservados.</Text>
              <Text style={[s.footerSubText, { color: colors.textLight }]}>Comunidad Segura · Conexiones Reales</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, icon, children, colors }: { title: string, icon: string, children: React.ReactNode, colors: any }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionIconCircle, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name={icon as any} size={20} color={colors.primary} />
        </View>
        <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function BulletPoint({ text, colors }: { text: string, colors: any }) {
  return (
    <View style={s.bulletRow}>
      <View style={s.bulletDot}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={StyleSheet.absoluteFillObject} />
      </View>
      <Text style={[s.bulletText, { color: colors.textDim }]}>{text}</Text>
    </View>
  );
}

function Definition({ term, desc, colors }: { term: string, desc: string, colors: any }) {
  return (
    <View style={[s.definition, { backgroundColor: `${colors.text}05` }]}>
      <Text style={[s.term, { color: colors.text }]}>{term}:</Text>
      <Text style={[s.desc, { color: colors.textDim }]}>{desc}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bgBlob: { position: 'absolute', width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5,
  },
  lastUpdate: { fontSize: 13, marginBottom: 30, fontStyle: 'italic' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionIconCircle: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  paragraph: { fontSize: 15, lineHeight: 24, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', marginBottom: 12, paddingLeft: 8, alignItems: 'flex-start' },
  bulletDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8, marginRight: 12, overflow: 'hidden' },
  bulletText: { fontSize: 15, lineHeight: 24, flex: 1 },
  definition: { marginBottom: 15, padding: 12, borderRadius: 15 },
  term: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: 14, lineHeight: 20 },
  footer: { marginTop: 20, alignItems: 'center' },
  footerDivider: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  footerText: { fontSize: 13, fontWeight: '600' },
  footerSubText: { fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },
});
