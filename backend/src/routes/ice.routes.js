const router = require('express').Router();
const axios  = require('axios');
const { verificarToken } = require('../middlewares/auth.middleware');

// GET /api/ice-servers
// Devuelve credenciales ICE (STUN + TURN) para WebRTC.
// Si se configuran METERED_API_KEY y METERED_APP_NAME, usa Metered.ca (50 GB/mes gratis).
// Si no, usa servidores de respaldo públicos.
router.get('/ice-servers', verificarToken, async (req, res) => {
  try {
    if (process.env.METERED_API_KEY && process.env.METERED_APP_NAME) {
      const url = `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials`;
      const { data } = await axios.get(url, {
        params:  { apiKey: process.env.METERED_API_KEY },
        timeout: 5000,
      });

      if (Array.isArray(data) && data.length > 0) {
        return res.json({ iceServers: data });
      }
    }
  } catch (err) {
    console.warn('⚠️ [ICE] No se pudo contactar Metered.ca, usando fallback:', err.message);
  }

  // Servidores de respaldo: Google STUN + openrelay TURN
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302'  },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      {
        urls:       'turn:openrelay.metered.ca:80',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls:       'turn:openrelay.metered.ca:443',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls:       'turns:openrelay.metered.ca:443',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  });
});

module.exports = router;
