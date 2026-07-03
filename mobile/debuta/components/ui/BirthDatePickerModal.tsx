// BirthDatePickerModal.tsx — Selector de fecha de nacimiento con 3 ruedas
// (día / mes / año) implementadas en JS puro con FlatList + snapToInterval.
//
// Reemplaza al DatePickerDialog nativo de Android en modo spinner, cuyo
// selector de año tiene un bug conocido: al desplazarlo "rebota" al año
// inicial (p. ej. 2000) y solo tras varios intentos toma el valor. Con este
// componente el valor seleccionado es 100% determinista y la UI es idéntica
// en Android e iOS.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';

const ITEM_H  = 44;   // alto de cada fila de la rueda
const VISIBLE = 5;    // filas visibles (impar para tener centro)
const PAD_V   = Math.floor(VISIBLE / 2) * ITEM_H;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const EDAD_MINIMA  = 18;   // Debuta es solo para mayores de edad
const EDAD_MAXIMA  = 100;

const diasEnMes = (year: number, month0: number) =>
  new Date(year, month0 + 1, 0).getDate();

// ── Rueda genérica ─────────────────────────────────────────────────────────────
function Wheel({
  data, selectedIndex, onSelect, flexSize = 1,
}: {
  data: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  flexSize?: number;
}) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<string>>(null);

  const clampIndex = (i: number) => Math.min(data.length - 1, Math.max(0, i));

  const handleEnd = (offsetY: number) => {
    const idx = clampIndex(Math.round(offsetY / ITEM_H));
    if (idx !== selectedIndex) {
      onSelect(idx);
      Haptics.selectionAsync().catch(() => {});
    }
    // Alinear exactamente al ítem (por si el momentum quedó a mitad de fila)
    listRef.current?.scrollToOffset({ offset: idx * ITEM_H, animated: true });
  };

  return (
    <View style={[w.wheelWrap, { flex: flexSize }]}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item, i) => `${item}-${i}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        initialScrollIndex={clampIndex(selectedIndex)}
        contentContainerStyle={{ paddingVertical: PAD_V }}
        style={{ height: ITEM_H * VISIBLE }}
        onMomentumScrollEnd={e => handleEnd(e.nativeEvent.contentOffset.y)}
        // Si el usuario suelta sin momentum, también capturamos el valor
        onScrollEndDrag={e => {
          const v = e.nativeEvent.velocity?.y ?? 0;
          if (Math.abs(v) < 0.1) handleEnd(e.nativeEvent.contentOffset.y);
        }}
        renderItem={({ item, index }) => {
          const active = index === selectedIndex;
          return (
            <View style={w.item}>
              <Text
                style={[
                  w.itemText,
                  { color: active ? colors.text : colors.textDim },
                  active && w.itemTextActive,
                ]}
                numberOfLines={1}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

// ── Modal principal ────────────────────────────────────────────────────────────
export default function BirthDatePickerModal({
  visible, value, onClose, onConfirm,
}: {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}) {
  const { colors, isDark } = useTheme();

  const hoy = new Date();
  const maxYear = hoy.getFullYear() - EDAD_MINIMA;   // año más reciente permitido
  const minYear = hoy.getFullYear() - EDAD_MAXIMA;

  // Años en orden descendente (los más recientes arriba)
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [maxYear, minYear]);

  const inicial = value ?? new Date(2000, 0, 1);
  const [selYear,  setSelYear]  = useState(Math.min(Math.max(inicial.getFullYear(), minYear), maxYear));
  const [selMonth, setSelMonth] = useState(inicial.getMonth());
  const [selDay,   setSelDay]   = useState(inicial.getDate());

  // Re-sincronizar con el valor externo cada vez que se abre
  useEffect(() => {
    if (!visible) return;
    const d = value ?? new Date(2000, 0, 1);
    setSelYear(Math.min(Math.max(d.getFullYear(), minYear), maxYear));
    setSelMonth(d.getMonth());
    setSelDay(d.getDate());
  }, [visible]);

  const totalDias = diasEnMes(selYear, selMonth);
  const dayClamped = Math.min(selDay, totalDias);

  const days = useMemo(
    () => Array.from({ length: totalDias }, (_, i) => String(i + 1)),
    [totalDias],
  );

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onConfirm(new Date(selYear, selMonth, dayClamped));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={w.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={[w.sheet, { backgroundColor: isDark ? '#1A1626' : '#FFFFFF' }]}>
            <Text style={[w.title, { color: colors.text }]}>Fecha de nacimiento</Text>
            <Text style={[w.subtitle, { color: colors.textDim }]}>
              Debes ser mayor de {EDAD_MINIMA} años para usar Debuta
            </Text>

            <View style={w.wheelsRow}>
              {/* Franja que resalta la fila central */}
              <View
                pointerEvents="none"
                style={[w.centerBand, {
                  backgroundColor: isDark ? 'rgba(139,92,246,0.10)' : 'rgba(139,92,246,0.06)',
                  borderColor: isDark ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.25)',
                }]}
              />
              {/* La rueda de días se remonta cuando cambia mes/año para
                  recalcular 28/29/30/31 días sin desincronizarse */}
              <Wheel
                key={`d-${selYear}-${selMonth}`}
                data={days}
                selectedIndex={dayClamped - 1}
                onSelect={i => setSelDay(i + 1)}
                flexSize={0.8}
              />
              <Wheel
                data={MESES}
                selectedIndex={selMonth}
                onSelect={setSelMonth}
                flexSize={1.4}
              />
              <Wheel
                data={years.map(String)}
                selectedIndex={years.indexOf(selYear)}
                onSelect={i => setSelYear(years[i])}
                flexSize={1}
              />
            </View>

            <View style={w.btnRow}>
              <TouchableOpacity
                style={[w.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F2F2F7' }]}
                onPress={onClose}
              >
                <Text style={[w.cancelText, { color: colors.textDim }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[w.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Text style={w.confirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const w = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  subtitle: { fontSize: 12.5, fontWeight: '500', textAlign: 'center', marginTop: 4, marginBottom: 14 },

  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  centerBand: {
    position: 'absolute',
    left: 0, right: 0,
    top: PAD_V,
    height: ITEM_H,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: -1,
  },
  wheelWrap: {},
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemTextActive: { fontSize: 17, fontWeight: '800' },

  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700' },
  confirmBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
