// FilterFunnel.tsx – Embudo de filtros premium para Discover
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Switch, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { Settings } from '../../hooks/useSettings';
import {
  Sparkles, Handshake, Heart, Gem, Waves, HelpCircle,
  Music, Plane, Trophy, Film, ChefHat, Palette, Laptop,
  BookOpen, Gamepad2, Camera, PersonStanding, Leaf,
  Dumbbell, Shirt, Radio, PawPrint,
  MapPin, Cake, User, MessageCircle, Star,
} from 'lucide-react-native';

// ─── Datos constantes ─────────────────────────────────────────────────────────

const GENDER_OPTS = [
  { value: 'ALL', label: 'Todos',    icon: 'people'  },
  { value: 'F',   label: 'Mujeres',  icon: 'female'  },
  { value: 'M',   label: 'Hombres',  icon: 'male'    },
] as const;

const LOOKING_FOR_OPTS = [
  { value: 'ALL',      label: 'Cualquier cosa', Icon: Sparkles  },
  { value: 'amistad',  label: 'Amistad',        Icon: Handshake },
  { value: 'citas',    label: 'Citas',           Icon: Heart     },
  { value: 'serio',    label: 'Relación seria',  Icon: Gem       },
  { value: 'casual',   label: 'Casual',          Icon: Waves     },
  { value: 'no_lo_se', label: 'Aún no lo sé',   Icon: HelpCircle },
] as const;

const INTERESTS_LIST = [
  { name: 'Música',       Icon: Music           },
  { name: 'Viajes',       Icon: Plane           },
  { name: 'Deportes',     Icon: Trophy          },
  { name: 'Cine',         Icon: Film            },
  { name: 'Cocina',       Icon: ChefHat         },
  { name: 'Arte',         Icon: Palette         },
  { name: 'Tecnología',   Icon: Laptop          },
  { name: 'Lectura',      Icon: BookOpen        },
  { name: 'Gaming',       Icon: Gamepad2        },
  { name: 'Fotografía',   Icon: Camera          },
  { name: 'Yoga',         Icon: PersonStanding  },
  { name: 'Naturaleza',   Icon: Leaf            },
  { name: 'Fitness',      Icon: Dumbbell        },
  { name: 'Moda',         Icon: Shirt           },
  { name: 'Baile',        Icon: Radio           },
  { name: 'Mascotas',     Icon: PawPrint        },
];

const DIST_STEPS = [5, 10, 20, 30, 50, 75, 100, 150, 200];

// ─── Sección colapsable ───────────────────────────────────────────────────────
function Section({ title, icon, badge, children }: {
  title: string; icon: React.ReactNode; badge?: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const { colors, isDark } = useTheme();
  const tc = isDark ? '#fff' : '#1a1a2e';
  const bc = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  return (
    <View style={[sec.wrap, { borderBottomColor: bc }]}>
      <TouchableOpacity style={sec.header} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
        <View style={sec.left}>
          {icon}
          <Text style={[sec.title, { color: tc }]}>{title}</Text>
          {badge != null && badge > 0 && (
            <View style={[sec.badge, { backgroundColor: colors.primary }]}>
              <Text style={sec.badgeTxt}>{badge}</Text>
            </View>
          )}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
      </TouchableOpacity>
      {open && <View style={sec.body}>{children}</View>}
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { borderBottomWidth: 1, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '800' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  body: { paddingBottom: 14 },
});

// ─── Chip genérico ────────────────────────────────────────────────────────────
function Chip({ label, active, onPress, primary, small, Icon: IconComponent }: {
  label: string; active: boolean; onPress: () => void; primary: string; small?: boolean;
  Icon?: React.ComponentType<any>;
}) {
  const { isDark } = useTheme();
  const bc = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const tc = isDark ? '#fff' : '#1a1a2e';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        ch.chip,
        small && ch.small,
        active ? { backgroundColor: primary, borderColor: primary } : { backgroundColor: 'transparent', borderColor: bc },
      ]}
    >
      {IconComponent && (
        <IconComponent size={small ? 11 : 13} color={active ? '#fff' : tc} />
      )}
      <Text style={[ch.label, { color: active ? '#fff' : tc, fontSize: small ? 12 : 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const ch = StyleSheet.create({
  chip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  small: { paddingHorizontal: 10, paddingVertical: 5 },
  label: { fontWeight: '700' },
});

// ─── Control de distancia compacto ────────────────────────────────────────────
function DistanceControl({ value, onChange, primary }: { value: number; onChange: (v: number) => void; primary: string }) {
  const idx = DIST_STEPS.findIndex(s => s >= value) === -1 ? DIST_STEPS.length - 1 : Math.max(0, DIST_STEPS.findIndex(s => s >= value));
  const { isDark } = useTheme();
  const tc = isDark ? '#fff' : '#1a1a2e';
  const bc = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const dec = () => { if (idx > 0) onChange(DIST_STEPS[idx - 1]); };
  const inc = () => { if (idx < DIST_STEPS.length - 1) onChange(DIST_STEPS[idx + 1]); };
  return (
    <View style={dc.row}>
      <TouchableOpacity onPress={dec} disabled={idx === 0} style={[dc.arrow, { borderColor: bc, opacity: idx === 0 ? 0.3 : 1 }]}>
        <Ionicons name="remove" size={18} color={primary} />
      </TouchableOpacity>
      <View style={dc.valWrap}>
        <Text style={[dc.val, { color: primary }]}>{value}</Text>
        <Text style={[dc.unit, { color: tc }]}>km</Text>
      </View>
      <TouchableOpacity onPress={inc} disabled={idx === DIST_STEPS.length - 1} style={[dc.arrow, { borderColor: bc, opacity: idx === DIST_STEPS.length - 1 ? 0.3 : 1 }]}>
        <Ionicons name="add" size={18} color={primary} />
      </TouchableOpacity>
    </View>
  );
}
const dc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 4 },
  arrow: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  valWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, minWidth: 90, justifyContent: 'center' },
  val: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  unit: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
});

// ─── Rango de edad compacto ───────────────────────────────────────────────────
function AgeRange({ min, max, onMin, onMax, primary, secondary }: {
  min: number; max: number; onMin: (v: number) => void; onMax: (v: number) => void;
  primary: string; secondary: string;
}) {
  const { isDark } = useTheme();
  const tc = isDark ? '#fff' : '#1a1a2e';
  const bc = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  return (
    <View style={ar.wrap}>
      {/* Min */}
      <View style={[ar.col, { borderColor: bc }]}>
        <Text style={[ar.label, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>DESDE</Text>
        <TouchableOpacity onPress={() => onMin(Math.max(18, min - 1))} style={ar.btn}>
          <Ionicons name="remove" size={14} color={primary} />
        </TouchableOpacity>
        <Text style={[ar.val, { color: primary }]}>{min}</Text>
        <TouchableOpacity onPress={() => onMin(Math.min(max - 1, min + 1))} style={ar.btn}>
          <Ionicons name="add" size={14} color={primary} />
        </TouchableOpacity>
      </View>
      {/* Separator */}
      <View style={ar.sep}>
        <Text style={[ar.dash, { color: tc }]}>—</Text>
      </View>
      {/* Max */}
      <View style={[ar.col, { borderColor: bc }]}>
        <Text style={[ar.label, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>HASTA</Text>
        <TouchableOpacity onPress={() => onMax(Math.max(min + 1, max - 1))} style={ar.btn}>
          <Ionicons name="remove" size={14} color={secondary} />
        </TouchableOpacity>
        <Text style={[ar.val, { color: secondary }]}>{max}</Text>
        <TouchableOpacity onPress={() => onMax(Math.min(80, max + 1))} style={ar.btn}>
          <Ionicons name="add" size={14} color={secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const ar = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  col: { flex: 1, alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingVertical: 10, gap: 4 },
  label: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  btn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  val: { fontSize: 30, fontWeight: '900', lineHeight: 34 },
  sep: { alignItems: 'center' },
  dash: { fontSize: 22, fontWeight: '300' },
});

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
interface Props {
  settings: Settings;
  saving: boolean;
  onSave: (partial: Partial<Settings>) => Promise<boolean>;
  onApplied: () => void;
}

export default function FilterFunnel({ settings, saving, onSave, onApplied }: Props) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);

  // Estado local editable
  const [dist,      setDist]      = useState(settings.max_distance);
  const [minAge,    setMinAge]    = useState(settings.min_age);
  const [maxAge,    setMaxAge]    = useState(settings.max_age);
  const [gender,    setGender]    = useState<'M' | 'F' | 'ALL'>(settings.show_me);
  const [lookFor,   setLookFor]   = useState<Settings['looking_for']>(settings.looking_for ?? 'ALL');
  const [interests, setInterests] = useState<string[]>(settings.interests_filter ?? []);
  const [verified,  setVerified]  = useState(settings.verified_only);
  const [hasBio,    setHasBio]    = useState(settings.has_bio_only);
  const [minPhotos, setMinPhotos] = useState(settings.min_photos);

  useEffect(() => {
    setDist(settings.max_distance);
    setMinAge(settings.min_age);
    setMaxAge(settings.max_age);
    setGender(settings.show_me);
    setLookFor(settings.looking_for ?? 'ALL');
    setInterests(settings.interests_filter ?? []);
    setVerified(settings.verified_only);
    setHasBio(settings.has_bio_only);
    setMinPhotos(settings.min_photos);
  }, [settings]);

  const resetLocal = () => {
    setDist(settings.max_distance); setMinAge(settings.min_age); setMaxAge(settings.max_age);
    setGender(settings.show_me); setLookFor(settings.looking_for ?? 'ALL');
    setInterests(settings.interests_filter ?? []); setVerified(settings.verified_only);
    setHasBio(settings.has_bio_only); setMinPhotos(settings.min_photos);
  };

  const toggleInterest = (name: string) => {
    setInterests(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]);
  };

  const apply = async () => {
    const ok = await onSave({
      max_distance: dist, min_age: minAge, max_age: maxAge,
      show_me: gender, looking_for: lookFor,
      interests_filter: interests, verified_only: verified,
      has_bio_only: hasBio, min_photos: minPhotos,
    });
    if (ok) { setOpen(false); onApplied(); }
  };

  const resetAll = async () => {
    const ok = await onSave({
      max_distance: 50, min_age: 18, max_age: 40, show_me: 'ALL',
      looking_for: 'ALL', interests_filter: [], verified_only: false,
      has_bio_only: false, min_photos: 0,
    });
    if (ok) { setOpen(false); onApplied(); }
  };

  // Contador de filtros activos
  const activeCount =
    (settings.max_distance !== 50 ? 1 : 0) +
    (settings.min_age !== 18 || settings.max_age !== 40 ? 1 : 0) +
    (settings.show_me !== 'ALL' ? 1 : 0) +
    ((settings.looking_for ?? 'ALL') !== 'ALL' ? 1 : 0) +
    ((settings.interests_filter ?? []).length > 0 ? 1 : 0) +
    (settings.verified_only ? 1 : 0) +
    (settings.has_bio_only ? 1 : 0) +
    (settings.min_photos > 0 ? 1 : 0);

  const tc  = isDark ? '#fff' : '#1a1a2e';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)';
  const cardBg = isDark ? '#16162a' : '#ffffff';
  const bc  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const overlayBg = 'rgba(0,0,0,0.55)';

  return (
    <>
      {/* ── Chip del header ── */}
      <TouchableOpacity
        onPress={() => { resetLocal(); setOpen(true); }}
        activeOpacity={0.8}
        style={[ff.chip, { backgroundColor: colors.card, borderColor: bc }]}
      >
        <Ionicons name="options" size={15} color={colors.primary} />
        <Text style={[ff.chipTxt, { color: tc }]}>Filtros</Text>
        {activeCount > 0 && (
          <LinearGradient colors={[colors.primary, colors.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={ff.badge}>
            <Text style={ff.badgeTxt}>{activeCount}</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>

      {/* ── Bottom Sheet ── */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[ff.overlay, { backgroundColor: overlayBg }]} onPress={() => setOpen(false)} />

        <View style={[ff.sheet, { backgroundColor: cardBg, borderColor: bc }]}>
          <View style={[ff.handle, { backgroundColor: bc }]} />

          {/* Header del sheet */}
          <View style={ff.sheetTop}>
            <View style={ff.sheetTitleRow}>
              <LinearGradient colors={[colors.primary, colors.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={ff.iconCircle}>
                <Ionicons name="funnel" size={16} color="#fff" />
              </LinearGradient>
              <Text style={[ff.sheetTitle, { color: tc }]}>Descubrir personas</Text>
            </View>
            {activeCount > 0 && (
              <TouchableOpacity onPress={resetAll} style={[ff.resetBtn, { borderColor: bc }]}>
                <Text style={[ff.resetTxt, { color: colors.primary }]}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ff.scroll}>

            {/* 1. DISTANCIA */}
            <Section title="Distancia máxima" icon={<MapPin size={18} color={colors.primary} />}>
              <DistanceControl value={dist} onChange={setDist} primary={colors.primary} />
            </Section>

            {/* 2. EDAD */}
            <Section title="Rango de edad" icon={<Cake size={18} color={colors.primary} />}>
              <AgeRange min={minAge} max={maxAge} onMin={setMinAge} onMax={setMaxAge}
                primary={colors.primary} secondary={colors.secondary} />
            </Section>

            {/* 3. GÉNERO */}
            <Section title="Mostrarme" icon={<User size={18} color={colors.primary} />}>
              <View style={ff.chipRow}>
                {GENDER_OPTS.map(o => (
                  <Chip key={o.value} label={o.label} active={gender === o.value}
                    onPress={() => setGender(o.value as any)} primary={colors.primary} />
                ))}
              </View>
            </Section>

            {/* 4. QUÉ BUSCAN */}
            <Section title="¿Qué buscan?" icon={<MessageCircle size={18} color={colors.primary} />} badge={(lookFor !== 'ALL' && lookFor) ? 1 : 0}>
              <View style={ff.chipWrap}>
                {LOOKING_FOR_OPTS.map(o => (
                  <Chip key={o.value} label={o.label}
                    Icon={o.Icon}
                    active={lookFor === o.value}
                    onPress={() => setLookFor(o.value as any)}
                    primary={colors.primary} small />
                ))}
              </View>
            </Section>

            {/* 5. INTERESES */}
            <Section title="Intereses en común" icon={<Sparkles size={18} color={colors.primary} />} badge={interests.length}>
              <Text style={[ff.hint, { color: sub }]}>
                Solo verás perfiles que tengan al menos uno de estos intereses
              </Text>
              <View style={ff.chipWrap}>
                {INTERESTS_LIST.map(i => (
                  <Chip key={i.name} label={i.name}
                    Icon={i.Icon}
                    active={interests.includes(i.name)}
                    onPress={() => toggleInterest(i.name)}
                    primary={colors.primary} small />
                ))}
              </View>
            </Section>

            {/* 6. CALIDAD */}
            <Section title="Calidad de perfiles" icon={<Star size={18} color={colors.primary} />}>
              {/* Verificados */}
              <View style={[ff.toggleRow, { borderColor: bc }]}>
                <View>
                  <Text style={[ff.toggleLabel, { color: tc }]}>Solo verificados</Text>
                  <Text style={[ff.toggleSub, { color: sub }]}>Con identidad confirmada</Text>
                </View>
                <Switch value={verified} onValueChange={setVerified}
                  trackColor={{ false: bc, true: colors.primary }} thumbColor="#fff" />
              </View>
              {/* Con bio */}
              <View style={[ff.toggleRow, { borderColor: bc }]}>
                <View>
                  <Text style={[ff.toggleLabel, { color: tc }]}>Con descripción</Text>
                  <Text style={[ff.toggleSub, { color: sub }]}>Perfiles que escribieron algo</Text>
                </View>
                <Switch value={hasBio} onValueChange={setHasBio}
                  trackColor={{ false: bc, true: colors.primary }} thumbColor="#fff" />
              </View>
              {/* Min fotos */}
              <View style={[ff.toggleRow, { borderColor: 'transparent' }]}>
                <View>
                  <Text style={[ff.toggleLabel, { color: tc }]}>Mínimo de fotos</Text>
                  <Text style={[ff.toggleSub, { color: sub }]}>Al menos {minPhotos} foto(s)</Text>
                </View>
                <View style={ff.photoSteps}>
                  {[0, 1, 2, 3].map(n => (
                    <TouchableOpacity key={n} onPress={() => setMinPhotos(n)}
                      style={[ff.photoBtn, minPhotos === n && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: bc }]}>
                      <Text style={[ff.photoBtnTxt, { color: minPhotos === n ? '#fff' : tc }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Section>

          </ScrollView>

          {/* ── Botón Aplicar ── */}
          <View style={[ff.footer, { borderTopColor: bc }]}>
            <TouchableOpacity onPress={apply} disabled={saving} activeOpacity={0.85} style={ff.applyWrap}>
              <LinearGradient colors={[colors.primary, colors.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={ff.applyBtn}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={ff.applyTxt}>{saving ? 'Guardando…' : 'Aplicar filtros'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const ff = StyleSheet.create({
  // Chip header
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 3 },
  chipTxt: { fontSize: 13, fontWeight: '700' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  // Sheet
  overlay: { flex: 1 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, maxHeight: '90%' },
  handle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 2 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  resetBtn: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  resetTxt: { fontSize: 13, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 8 },
  // Layout helpers
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 11, marginBottom: 10, lineHeight: 16 },
  // Toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  toggleLabel: { fontSize: 13, fontWeight: '700' },
  toggleSub: { fontSize: 11, marginTop: 2 },
  // Photo steps
  photoSteps: { flexDirection: 'row', gap: 6 },
  photoBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  photoBtnTxt: { fontSize: 13, fontWeight: '700' },
  // Footer
  footer: { borderTopWidth: 1, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingHorizontal: 20 },
  applyWrap: { borderRadius: 18, overflow: 'hidden' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  applyTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
