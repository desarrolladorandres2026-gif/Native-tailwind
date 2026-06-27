/**
 * push.js
 * Envío de notificaciones push a dispositivos mediante el servicio de Expo.
 *
 * Documentación: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * No requiere SDK adicional: se hace un POST a la Expo Push API con axios
 * (ya presente en las dependencias del backend).
 *
 * En Android, Expo entrega a través de FCM, por lo que es necesario tener
 * configuradas las credenciales de FCM (FCM V1 Service Account) en el proyecto
 * de Expo/EAS. Ver NOTIFICACIONES_PUSH.md.
 */

const axios = require('axios');
const Usuario = require('../models/usuario.model');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Valida que el token tenga el formato de un Expo push token. */
function esTokenExpoValido(token) {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
  );
}

/** Divide un array en lotes de tamaño `size`. */
function enLotes(arr, size) {
  const lotes = [];
  for (let i = 0; i < arr.length; i += size) {
    lotes.push(arr.slice(i, i + size));
  }
  return lotes;
}

/**
 * Envía una notificación push a uno o varios Expo push tokens.
 *
 * @param {string|string[]} tokens  Token(s) destino.
 * @param {object} opciones
 * @param {string} opciones.title           Título de la notificación.
 * @param {string} opciones.body            Cuerpo de la notificación.
 * @param {object} [opciones.data]          Datos extra (se reciben al tocar la notif).
 * @param {string} [opciones.channelId]     Canal Android ('messages' | 'calls').
 * @param {'default'|'high'} [opciones.priority='high']  Prioridad de entrega.
 * @param {string|null} [opciones.sound='default']       Sonido ('default' o null).
 * @param {number} [opciones.ttl]           Tiempo de vida en segundos.
 * @returns {Promise<{ ok: boolean, tokensInvalidos: string[] }>}
 */
async function enviarPush(tokens, opciones = {}) {
  const lista = (Array.isArray(tokens) ? tokens : [tokens]).filter(esTokenExpoValido);
  if (lista.length === 0) {
    return { ok: false, tokensInvalidos: [] };
  }

  const {
    title,
    body,
    data = {},
    channelId,
    priority = 'high',
    sound = 'default',
    ttl,
  } = opciones;

  const tokensInvalidos = [];

  // Expo recomienda lotes de hasta 100 mensajes por petición.
  const lotes = enLotes(lista, 100);

  for (const lote of lotes) {
    const mensajes = lote.map((to) => ({
      to,
      title,
      body,
      data,
      sound,
      priority,
      ...(channelId ? { channelId } : {}),
      ...(typeof ttl === 'number' ? { ttl } : {}),
    }));

    try {
      const { data: respuesta } = await axios.post(EXPO_PUSH_URL, mensajes, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        timeout: 10000,
      });

      // La respuesta trae un "ticket" por cada mensaje, en el mismo orden.
      const tickets = Array.isArray(respuesta?.data) ? respuesta.data : [];
      tickets.forEach((ticket, idx) => {
        if (
          ticket?.status === 'error' &&
          ticket?.details?.error === 'DeviceNotRegistered'
        ) {
          // El token ya no es válido (app desinstalada / permisos revocados).
          tokensInvalidos.push(lote[idx]);
        }
      });
    } catch (err) {
      console.error('[push] Error enviando a Expo:', err.response?.data || err.message);
    }
  }

  return { ok: true, tokensInvalidos };
}

/**
 * Atajo: envía push a un usuario por su ID, leyendo sus pushTokens y
 * respetando una preferencia de settings opcional.
 *
 * @param {string} usuarioId
 * @param {object} opciones        Mismas opciones que enviarPush.
 * @param {string|null} [prefKey]  Clave de settings a respetar (ej. 'notif_messages').
 *                                  Si está en false, no se envía.
 */
async function enviarPushAUsuario(usuarioId, opciones, prefKey = null) {
  try {
    const usuario = await Usuario.findById(usuarioId)
      .select('pushTokens settings')
      .lean();

    if (!usuario || !Array.isArray(usuario.pushTokens) || usuario.pushTokens.length === 0) {
      return;
    }

    if (prefKey && usuario.settings && usuario.settings[prefKey] === false) {
      return; // El usuario desactivó este tipo de notificación.
    }

    const { tokensInvalidos } = await enviarPush(usuario.pushTokens, opciones);

    // Limpiar tokens que Expo reportó como no registrados.
    if (tokensInvalidos.length > 0) {
      await Usuario.findByIdAndUpdate(usuarioId, {
        $pull: { pushTokens: { $in: tokensInvalidos } },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[push] enviarPushAUsuario:', err.message);
  }
}

module.exports = { enviarPush, enviarPushAUsuario, esTokenExpoValido };
