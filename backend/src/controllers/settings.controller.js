const Usuario = require('../models/usuario.model');
const { serializarUsuario } = require('../helpers/serializer');
const bcrypt = require('bcryptjs');

// ── GET /api/settings ────────────────────────────────────────────────
const obtenerSettings = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select('settings');
    res.json({ settings: usuario.settings });
  } catch (err) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── PUT /api/settings ────────────────────────────────────────────────
// SettingsScreen envía cualquier combinación de:
// { max_distance, min_age, max_age, show_me,
//   notif_matches, notif_messages, notif_recomend,
//   show_distance, show_age, profile_visible }
const actualizarSettings = async (req, res) => {
  try {
    const camposPermitidos = [
      'max_distance', 'min_age', 'max_age', 'show_me',
      'verified_only', 'has_bio_only', 'min_photos',
      'notif_matches', 'notif_messages', 'notif_recomend',
      'show_distance', 'show_age', 'profile_visible',
    ];

    const update = {};
    camposPermitidos.forEach(k => {
      if (req.body[k] !== undefined) {
        update[`settings.${k}`] = req.body[k];
      }
    });

    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      { $set: update },
      { new: true }
    );

    res.json({ message: 'Configuración guardada', settings: usuario.settings });
  } catch (err) {
    console.error('actualizarSettings:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── PUT /api/settings/password ───────────────────────────────────────
// SettingsScreen → "Cambiar contraseña"
const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ message: 'Ambas contraseñas son requeridas' });
    }
    if (password_nueva.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener mínimo 6 caracteres' });
    }

    const usuario = await Usuario.findById(req.usuario._id).select('+password');
    const ok      = await usuario.compararPassword(password_actual);

    if (!ok) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    usuario.password = password_nueva;
    await usuario.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('cambiarPassword:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { obtenerSettings, actualizarSettings, cambiarPassword };
