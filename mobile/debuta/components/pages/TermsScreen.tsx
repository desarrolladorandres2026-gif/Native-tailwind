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

const { width: W } = Dimensions.get('window');

const C = {
  primary: '#FD297B',
  secondary: '#FF655B',
  gradient: ['#FF5864', '#FF655B', '#FD297B'] as const,
  background: '#FFFFFF',
  text: '#1A1A1A',
  textSoft: '#666666',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
};

export default function TermsScreen() {
  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(253, 41, 123, 0.05)', 'transparent']}
          style={[s.bgBlob, { top: -W * 0.2, left: -W * 0.1 }]}
        />
        <LinearGradient
          colors={['rgba(255, 101, 91, 0.05)', 'transparent']}
          style={[s.bgBlob, { bottom: -W * 0.2, right: -W * 0.1 }]}
        />
      </View>

      <FloatingHearts />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header Glassmorphism */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <View style={s.backIconCircle}>
              <Ionicons name="chevron-back" size={24} color={C.primary} />
            </View>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Términos y Privacidad</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={s.scrollContent}
        >
          <View style={s.card}>
            <Text style={s.lastUpdate}>Última actualización: 8 de mayo, 2026</Text>

            <Section title="1. ACEPTACIÓN DE LOS TÉRMINOS" icon="document-text-outline">
              <Text style={s.paragraph}>
                Al descargar, instalar o utilizar la aplicación Debuta ("la Aplicación"), usted acepta cumplir y estar sujeto a los siguientes Términos y Condiciones de Uso. Si no está de acuerdo con estos términos, no debe utilizar la Aplicación.
              </Text>
            </Section>

            <Section title="2. ELEGIBILIDAD" icon="person-add-outline">
              <Text style={s.paragraph}>
                Para utilizar Debuta, debe tener al menos 18 años de edad. Al crear una cuenta, usted garantiza que cumple con este requisito de edad y que tiene la capacidad legal para aceptar estos términos.
              </Text>
            </Section>

            <Section title="3. DESCRIPCIÓN DEL SERVICIO" icon="flash-outline">
              <Text style={s.paragraph}>
                Debuta es una plataforma diseñada para conectar personas reales en un entorno social seguro. Los servicios incluyen la creación de perfiles, interacción mediante mensajes y sistemas de emparejamiento inteligente.
              </Text>
            </Section>

            <Section title="4. CONTENIDO GENERADO POR EL USUARIO" icon="images-outline">
              <Text style={s.paragraph}>
                Usted es el único responsable del contenido que publique. Al utilizar la aplicación, se compromete a:
              </Text>
              <BulletPoint text="No publicar contenido ilegal, obsceno o discriminatorio." />
              <BulletPoint text="No infringir derechos de propiedad intelectual." />
              <BulletPoint text="No publicar contenido sexual explícito (Tolerancia Cero)." />
            </Section>

            <Section title="5. SEGURIDAD Y MODERACIÓN" icon="shield-checkmark-outline">
              <Text style={s.paragraph}>
                Para garantizar un entorno seguro, implementamos las siguientes medidas:
              </Text>
              <BulletPoint text="Reportes: Puede reportar cualquier perfil o mensaje inapropiado." />
              <BulletPoint text="Bloqueos: Puede bloquear a cualquier usuario en cualquier momento." />
              <BulletPoint text="Moderación: Revisamos reportes en menos de 24 horas." />
            </Section>

            <Section title="6. POLÍTICA DE PRIVACIDAD" icon="lock-closed-outline">
              <Text style={s.paragraph}>
                Su privacidad es fundamental. Recopilamos y tratamos sus datos con transparencia:
              </Text>
              <Definition 
                term="Datos de Perfil" 
                desc="Nombre, correo, fecha de nacimiento y fotos necesarios para la funcionalidad." 
              />
              <Definition 
                term="Ubicación" 
                desc="Utilizamos su GPS para mostrarle usuarios cercanos y facilitar el descubrimiento." 
              />
              <Definition 
                term="Uso de Datos" 
                desc="No vendemos sus datos. Los usamos para mejorar su experiencia en la plataforma." 
              />
            </Section>

            <View style={s.footer}>
              <LinearGradient colors={C.gradient} style={s.footerDivider} start={[0,0]} end={[1,0]} />
              <Text style={s.footerText}>© 2026 Debuta. Todos los derechos reservados.</Text>
              <Text style={s.footerSubText}>Comunidad Segura · Conexiones Reales</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, icon, children }: { title: string, icon: string, children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconCircle}>
          <Ionicons name={icon as any} size={20} color={C.primary} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <View style={s.bulletDot}>
        <LinearGradient colors={C.gradient} style={StyleSheet.absoluteFillObject} />
      </View>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function Definition({ term, desc }: { term: string, desc: string }) {
  return (
    <View style={s.definition}>
      <Text style={s.term}>{term}:</Text>
      <Text style={s.desc}>{desc}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  bgBlob: { position: 'absolute', width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: C.glass,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text, flex: 1, textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: C.glass,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: C.glassBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5,
  },
  lastUpdate: { color: C.textSoft, fontSize: 13, marginBottom: 30, fontStyle: 'italic' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionIconCircle: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(253, 41, 123, 0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  paragraph: { color: C.textSoft, fontSize: 15, lineHeight: 24, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', marginBottom: 12, paddingLeft: 8, alignItems: 'flex-start' },
  bulletDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8, marginRight: 12, overflow: 'hidden' },
  bulletText: { color: C.textSoft, fontSize: 15, lineHeight: 24, flex: 1 },
  definition: { marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 15 },
  term: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  desc: { color: C.textSoft, fontSize: 14, lineHeight: 20 },
  footer: { marginTop: 20, alignItems: 'center' },
  footerDivider: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  footerText: { color: C.textSoft, fontSize: 13, fontWeight: '600' },
  footerSubText: { color: 'rgba(0,0,0,0.3)', fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },
});
