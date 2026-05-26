// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Módulos nativos que NO deben resolverse en la plataforma web
const NATIVE_ONLY_MODULES = [
  'react-native-webrtc',
  'react-native-incall-manager',
];

// Stub vacío para módulos nativos en web
const emptyModule = path.resolve(__dirname, 'metro-empty-module.js');

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // En web, reemplazar módulos nativos por un módulo vacío
  if (
    platform === 'web' &&
    NATIVE_ONLY_MODULES.some(
      (mod) => moduleName === mod || moduleName.startsWith(mod + '/')
    )
  ) {
    return {
      filePath: emptyModule,
      type: 'sourceFile',
    };
  }

  // Para todo lo demás, usar el resolver por defecto
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
