import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { AlertProvider } from '../hooks/useCustomAlert';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenSDK from 'expo-splash-screen';
import { ThemeProvider } from '../theme/ThemeContext';

// Mantener el splash nativo visible hasta que lo ocultemos manualmente
SplashScreenSDK.preventAutoHideAsync();

import { SocketProvider } from '../context/SocketContext';
import { CallProvider } from '../context/CallContext';
import { NotificationProvider } from '../context/NotificationContext';

export default function RootLayout() {
  const hidden = useRef(false);

  useEffect(() => {
    // Ocultamos el splash nativo tan pronto el layout monte
    // El SplashScreen animado (index.tsx) se encarga del resto
    if (!hidden.current) {
      hidden.current = true;
      SplashScreenSDK.hideAsync();
    }
  }, []);

  return (
    <ThemeProvider>
      <SocketProvider>
        <NotificationProvider>
          <CallProvider>
            <AlertProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="rules" options={{ headerShown: false }} />
                <Stack.Screen name="terms" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                <Stack.Screen name="verify-code" options={{ headerShown: false }} />
                <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                <Stack.Screen name="call" options={{ 
                  headerShown: false,
                  presentation: 'fullScreenModal',
                  animation: 'fade'
                }} />
                <Stack.Screen name="partner" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
            </AlertProvider>
          </CallProvider>
        </NotificationProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}
