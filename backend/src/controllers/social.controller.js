/**
 * social.controller.js
 * Autenticación social: Google y Facebook
 * + algoritmo de conexiones en común (afinidad + amigos FB en Debuta)
 */

const { OAuth2Client } = require('google-auth-library');
const axios            = require('axios');
const jwt              = require('jsonwebtoken');
const Usuario          = require('../models/usuario.model');
const { serializarUsuario } = require('../helpers/serializer');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Helpers ───────────────────────────────────────────────────────────────────
const generarUsername = async (nombre) => {
  const base   = nombre.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  let   username = `${base}${suffix}`;
  while (await Usuario.exists({ username })) {
    username = `${base}${Math.floor(Math.random() * 9000) + 1000}`;
  }
  return username;
};

// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Recibe idToken de Google, verifica, crea/encuentra usuario, devuelve JWT
const loginGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken requerido' });

    // Verificar token con Google
    const ticket  = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name, family_name, picture } = payload;

    // Buscar usuario existente por googleId o correo
    let usuario = await Usuario.findOne({ $or: [{ googleId }, { correo: email }] });

    if (usuario) {
      // Si encontró por correo pero no tiene googleId → vincular
      if (!usuario.googleId) {
        usuario.googleId      = googleId;
        usuario.auth_provider = 'google';
        if (picture && !usuario.profile_picture) {
          usuario.profile_picture = { url: picture, public_id: `google_${googleId}` };
        }
        await usuario.save();
      }
    } else {
      // Crear nuevo usuario
      const username = await generarUsername(given_name || email.split('@')[0]);
      usuario = await Usuario.create({
        googleId,
        auth_provider:   'google',
        correo:          email,
        username,
        first_name:      given_name  || email.split('@')[0],
        last_name:       family_name || '',
        password:        Math.random().toString(36) + Math.random().toString(36), // dummy, no se usa
        telefono:        '0000000000', // placeholder para usuarios sociales
        gender:          'prefiero_no_decir',
        birth_date:      new Date('2000-01-01'), // placeholder
        profile_picture: picture ? { url: picture, public_id: `google_${googleId}` } : null,
        is_verified:     true,
        needs_profile_completion: true, // flag para completar perfil después
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({ message: 'Cuenta desactivada' });
    }

    const access_token = generarToken(usuario._id);
    res.json({ access_token, usuario: serializarUsuario(usuario) });

  } catch (err) {
    console.error('loginGoogle:', err);
    res.status(401).json({ message: 'Token de Google inválido' });
  }
};

// ── POST /api/auth/facebook ───────────────────────────────────────────────────
// Recibe accessToken de Facebook, verifica con Graph API, crea/encuentra usuario
const loginFacebook = async (req, res) => {
  try {
    const { accessToken, userID } = req.body;
    if (!accessToken) return res.status(400).json({ message: 'accessToken requerido' });

    // Verificar token con Facebook Graph API
    const verifyUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const verifyRes = await axios.get(verifyUrl);

    if (!verifyRes.data?.data?.is_valid) {
      return res.status(401).json({ message: 'Token de Facebook inválido' });
    }

    // Obtener datos del usuario de Facebook
    const profileUrl = `https://graph.facebook.com/${userID}?fields=id,name,first_name,last_name,email,picture.type(large)&access_token=${accessToken}`;
    const profileRes = await axios.get(profileUrl);
    const fb         = profileRes.data;

    const facebookId = fb.id;
    const email      = fb.email || `fb_${facebookId}@debuta.app`;
    const picture    = fb.picture?.data?.url;

    // Buscar usuario por facebookId o correo
    let usuario = await Usuario.findOne({ $or: [{ facebookId }, { correo: email }] });

    if (usuario) {
      if (!usuario.facebookId) {
        usuario.facebookId    = facebookId;
        usuario.auth_provider = 'facebook';
        if (picture && !usuario.profile_picture) {
          usuario.profile_picture = { url: picture, public_id: `fb_${facebookId}` };
        }
        await usuario.save();
      }
    } else {
      const username = await generarUsername(fb.first_name || 'usuario');
      usuario = await Usuario.create({
        facebookId,
        auth_provider:   'facebook',
        correo:          email,
        username,
        first_name:      fb.first_name || 'Usuario',
        last_name:       fb.last_name  || '',
        password:        Math.random().toString(36) + Math.random().toString(36),
        telefono:        '0000000000',
        gender:          'prefiero_no_decir',
        birth_date:      new Date('2000-01-01'),
        profile_picture: picture ? { url: picture, public_id: `fb_${facebookId}` } : null,
        is_verified:     true,
        needs_profile_completion: true,
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({ message: 'Cuenta desactivada' });
    }

    const access_token = generarToken(usuario._id);
    res.json({ access_token, usuario: serializarUsuario(usuario) });

  } catch (err) {
    console.error('loginFacebook:', err?.response?.data || err.message);
    res.status(401).json({ message: 'Error al verificar token de Facebook' });
  }
};

// ── POST /api/auth/social/friends ─────────────────────────────────────────────
// Sincroniza lista de IDs de amigos de Facebook del usuario actual
const sincronizarAmigos = async (req, res) => {
  try {
    const { friendIds = [] } = req.body; // array de facebookIds de amigos
    await Usuario.findByIdAndUpdate(req.usuario._id, {
      $set: { social_friend_ids: friendIds },
    });
    res.json({ message: 'Amigos sincronizados', count: friendIds.length });
  } catch (err) {
    console.error('sincronizarAmigos:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// ── GET /api/auth/common-connections/:userId ──────────────────────────────────
// Devuelve conexiones en común con otro usuario (amigos FB + afinidad)
const conexionesEnComun = async (req, res) => {
  try {
    const yo      = req.usuario;
    const otroId  = req.params.userId;
    const otro    = await Usuario.findById(otroId).select(
      'social_friend_ids interests ciudad pais birth_date'
    );
    if (!otro) return res.status(404).json({ message: 'Usuario no encontrado' });

    // 1. Amigos de Facebook en común en Debuta
    let amigosFB = 0;
    const misAmigos    = yo.social_friend_ids   || [];
    const susAmigos    = otro.social_friend_ids  || [];
    if (misAmigos.length && susAmigos.length) {
      const susSet = new Set(susAmigos);
      // Buscar cuántos de sus amigos están registrados en Debuta como yo amigo
      amigosFB = misAmigos.filter(id => susSet.has(id)).length;
    }

    // 2. Intereses en común
    const misIntereses  = (yo.interests   || []).map(i => i.name);
    const susIntereses  = (otro.interests || []).map(i => i.name);
    const interesesComun = misIntereses.filter(i => susIntereses.includes(i));

    // 3. Ciudad / país en común
    const ciudadComun = yo.ciudad && otro.ciudad &&
      yo.ciudad.toLowerCase() === otro.ciudad.toLowerCase();
    const paisComun   = yo.pais   && otro.pais   &&
      yo.pais.toLowerCase()   === otro.pais.toLowerCase();

    // 4. Rango de edad similar (±5 años)
    let edadSimilar = false;
    if (yo.birth_date && otro.birth_date) {
      const edadYo   = Math.floor((Date.now() - yo.birth_date)   / (365.25 * 24 * 3600 * 1000));
      const edadOtro = Math.floor((Date.now() - otro.birth_date) / (365.25 * 24 * 3600 * 1000));
      edadSimilar = Math.abs(edadYo - edadOtro) <= 5;
    }

    // Score total
    const score = amigosFB * 3 + interesesComun.length * 2 + (ciudadComun ? 2 : 0) + (paisComun ? 1 : 0) + (edadSimilar ? 1 : 0);

    res.json({
      amigosFB,
      interesesComun,
      ciudadComun,
      paisComun,
      edadSimilar,
      score,
      resumen: _resumenConexion({ amigosFB, interesesComun, ciudadComun }),
    });
  } catch (err) {
    console.error('conexionesEnComun:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// Texto descriptivo para mostrar en la UI
const _resumenConexion = ({ amigosFB, interesesComun, ciudadComun }) => {
  const partes = [];
  if (amigosFB > 0)           partes.push(`${amigosFB} amigo${amigosFB > 1 ? 's' : ''} en común`);
  if (interesesComun.length)   partes.push(`${interesesComun.length} interés${interesesComun.length > 1 ? 'es' : ''} en común`);
  if (ciudadComun)             partes.push('misma ciudad');
  return partes.join(' · ') || null;
};

module.exports = { loginGoogle, loginFacebook, sincronizarAmigos, conexionesEnComun };
