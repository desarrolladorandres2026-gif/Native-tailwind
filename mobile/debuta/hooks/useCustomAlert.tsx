// useCustomAlert.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { boxShadow } from '../components/utils/shadow';

type AlertButton = {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
};

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

interface AlertContextProps {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => setConfig(options);
  const hideAlert = () => setConfig(null);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {config && (
        <CustomAlertModal visible={!!config} options={config} onClose={hideAlert} />
      )}
    </AlertContext.Provider>
  );
};

export const useCustomAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useCustomAlert must be used within an AlertProvider');
  return context;
};

const { width: W } = Dimensions.get('window');

const CustomAlertModal = ({ visible, options, onClose }: { visible: boolean; options: AlertOptions; onClose: () => void; }) => {
  const handlePress = (btn: AlertButton) => {
    onClose();
    if (btn.onPress) setTimeout(btn.onPress, 300);
  };

  const buttons = options.buttons || [{ text: 'Entendido', onPress: () => {} }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {options.icon && (
            <View style={s.iconWrap}>
              <Ionicons name={options.icon} size={32} color={options.iconColor || '#FF2D55'} />
            </View>
          )}

          <Text style={s.title}>{options.title}</Text>
          {options.message && <Text style={s.message}>{options.message}</Text>}

          <View style={s.btnRow}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.btn,
                    buttons.length > 1 && { flex: 1 },
                    isCancel && s.btnCancel,
                    isDestructive && s.btnDestructive,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    s.btnText,
                    isCancel && s.btnTextCancel,
                    isDestructive && s.btnTextDestructive,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: W * 0.85, backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, alignItems: 'center', boxShadow: boxShadow('#000', 10, 20, 0.2) },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '900', color: '#000', textAlign: 'center', marginBottom: 10 },
  message: { fontSize: 16, color: '#8E8E93', textAlign: 'center', marginBottom: 30, lineHeight: 22, fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { backgroundColor: '#FF2D55', paddingVertical: 15, borderRadius: 18, alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  btnCancel: { backgroundColor: '#F2F2F7' },
  btnTextCancel: { color: '#8E8E93' },
  btnDestructive: { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderWidth: 1, borderColor: '#FF3B30' },
  btnTextDestructive: { color: '#FF3B30' },
});
