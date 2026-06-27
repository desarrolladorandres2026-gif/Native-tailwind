# Notificaciones Push (Expo) — Guía de configuración

Este documento explica cómo quedó implementado el sistema de notificaciones push
para que **mensajes** y **llamadas** lleguen al teléfono aunque la app esté cerrada,
y los **pasos manuales** que debes completar tú (Firebase + EAS) para que funcione
en Android.

---

## 1. Qué se implementó (ya está en el código)

### Cliente (`mobile/debuta`)
- **`components/services/pushNotifications.ts`**: pide permisos, crea los canales de
  Android (`messages` y `calls`), obtiene el *Expo push token* y lo sincroniza con el
  backend (`POST /api/notifications/token`). En logout lo elimina.
- **`context/PushNotificationProvider.tsx`**: registra el token cuando hay sesión y
  maneja el "tap" sobre la notificación:
  - `message` → abre el chat con el remitente.
  - `call` → solo abre la app; el socket reconecta y el backend reenvía la llamada
    pendiente, que dispara la pantalla de llamada entrante.
- Montado en `app/_layout.tsx`. Se registra también tras el login.
- `app.json`: plugin `expo-notifications`, permiso `POST_NOTIFICATIONS`,
  `android.googleServicesFile` y color de notificación.

### Backend
- **`src/models/usuario.model.js`**: nuevo campo `pushTokens: [String]`.
- **`src/helpers/push.js`**: `enviarPush()` y `enviarPushAUsuario()` (Expo Push API).
- **`src/controllers/notification.controller.js`** + **`src/routes/notification.routes.js`**:
  `POST /api/notifications/token` y `DELETE /api/notifications/token`.
- **`src/socket.js`**: al recibir un mensaje o una llamada, si el receptor está
  **offline** (sin socket), envía push (`messages` / `calls`).
- **`src/controllers/chat.controller.js`**: mismo push en el fallback HTTP de mensajes.

> Las notificaciones de mensaje respetan `settings.notif_messages`. Las de llamada
> siempre se envían.

---

## 2. Pasos manuales OBLIGATORIOS (Android)

Expo entrega las push de Android a través de **Firebase Cloud Messaging (FCM)**.
Sin estos pasos, el token se genera pero **no llegan** las notificaciones en builds
de producción.

### 2.1. Crear el proyecto en Firebase
1. Entra a <https://console.firebase.google.com> y crea un proyecto (o usa uno existente).
2. **Agregar app → Android**.
3. **Nombre del paquete Android**: `com.andressofia.debuta` (debe coincidir exactamente
   con `android.package` de `app.json`).
4. Descarga el archivo **`google-services.json`**.

### 2.2. Colocar `google-services.json`
- Guárdalo en: `mobile/debuta/google-services.json`
  (la ruta ya está referenciada en `app.json` → `android.googleServicesFile`).
- ⚠️ No lo subas a un repo público. Para EAS, súbelo como *secret file* o
  inclúyelo en el build (ver abajo).

### 2.3. Subir las credenciales de FCM V1 a Expo/EAS
Para que el servicio de Expo pueda enviar a tu proyecto de FCM:
1. En Firebase: **⚙️ Configuración del proyecto → Cuentas de servicio →
   Generar nueva clave privada** → descarga el JSON del *service account*.
2. Sube esa clave a EAS:
   ```bash
   cd mobile/debuta
   eas credentials
   # Plataforma: Android → tu perfil → "Google Service Account" →
   # "Manage your Google Service Account Key for Push Notifications (FCM V1)"
   # y selecciona el JSON descargado.
   ```
   (También puede hacerse desde el dashboard: expo.dev → tu proyecto → Credentials).

### 2.4. Reconstruir la APK/AAB
Las push **no funcionan en Expo Go** ni sin reconstruir. Genera un nuevo build:
```bash
cd mobile/debuta
eas build --platform android --profile preview   # o production
```

---

## 3. Cómo probar
1. Instala el nuevo build en un teléfono físico e inicia sesión (acepta el permiso
   de notificaciones).
2. Verifica en la base de datos que el usuario tenga `pushTokens` con un valor
   `ExponentPushToken[...]`.
3. Cierra la app por completo.
4. Desde otra cuenta, envíale un mensaje o una llamada → debe aparecer la
   notificación en la barra del sistema.

Prueba rápida del token (sin pasar por el chat):
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{"to":"ExponentPushToken[xxxx]","title":"Prueba","body":"Hola 👋","channelId":"messages"}'
```

---

## 4. Notas y limitaciones
- **Llamadas**: el push abre la app y la llamada se entrega vía socket si el usuario
  abre dentro de **60 s** (TTL de la llamada pendiente en `socket.js`). No es una
  pantalla de llamada nativa estilo WhatsApp (eso requeriría CallKeep/full-screen
  intent, mucho más trabajo nativo).
- **iOS**: no está activado. Requeriría cuenta de Apple Developer + APNs Key y, para
  llamadas, idealmente PushKit/CallKit.
- **Sonido de llamada personalizado**: el canal `calls` usa el sonido por defecto del
  sistema. Para un timbre propio hay que añadir el `.wav` vía la opción `sounds` del
  plugin `expo-notifications` y referenciarlo en el canal.
