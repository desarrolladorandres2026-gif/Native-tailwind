const router = require('express').Router();
const axios  = require('axios');
const { verificarToken } = require('../middlewares/auth.middleware');

// Servidores STUN públicos de Google (descubrimiento de candidatos).
const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302'  },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

// TURN propio (coturn autohospedado en el VPS). Se configura por entorno:
//   TURN_URLS=turn:187.77.12.228:3478?transport=udp,turn:187.77.12.228:3478?transport=tcp
//   TURN_USERNAME=debutaturn
//   TURN_PASSWORD=<clave>
// Devuelve [] si no está configurado.
function envTurn() {
  const urls = process.env.TURN_URLS;
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_PASSWORD;
  if (urls && username && credential) {
    return [{
      urls: urls.split(',').map(u => u.trim()).filter(Boolean),
      username,
      credential,
    }];
  }
  return [];
}

// GET /api/ice-servers
// Devuelve credenciales ICE (STUN + TURN) para WebRTC.
// Orden de preferencia del TURN:
//   1. Metered.ca si METERED_API_KEY y METERED_APP_NAME están configurados.
//   2. TURN propio (coturn) vía TURN_URLS/TURN_USERNAME/TURN_PASSWORD.
//   3. Solo STUN (sin TURN) como último recurso.
router.get('/ice-servers', verificarToken, async (req, res) => {
  const turnPropio = envTurn();

  try {
    if (process.env.METERED_API_KEY && process.env.METERED_APP_NAME) {
      const url = `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials`;
      const { data } = await axios.get(url, {
        params:  { apiKey: process.env.METERED_API_KEY },
        timeout: 5000,
      });

      if (Array.isArray(data) && data.length > 0) {
        // Metered ya incluye STUN + TURN; añadimos el TURN propio como respaldo.
        return res.json({ iceServers: [...data, ...turnPropio] });
      }
    }
  } catch (err) {
    console.warn('⚠️ [ICE] No se pudo contactar Metered.ca, usando TURN propio/STUN:', err.message);
  }

  // Sin Metered: STUN de Google + TURN propio (coturn). Si no hay TURN propio,
  // al menos devolvemos STUN (mejor que un TURN público muerto).
  if (turnPropio.length === 0) {
    console.warn('⚠️ [ICE] No hay TURN configurado (METERED_* ni TURN_*). Las llamadas en NAT simétrico/datos móviles fallarán.');
  }
  res.json({ iceServers: [...STUN_SERVERS, ...turnPropio] });
});

module.exports = router;
