/**
 * notification.controller.js
 * Registro y eliminación de Expo push tokens del usuario autenticado.
 */

const Usuario = require('../models/usuario.model');
const { esTokenExpoValido } = require('../helpers/push');

// ── POST /api/notifications/token ─────────────────────────────────────────────
// Guarda (sin duplicar) el Expo push token del dispositivo actual.
const registrarToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!esTokenExpoValido(token)) {
      return res.status(400).json({ message: 'Token de push inválido' });
    }

    // Un dispositivo pertenece a UNA sola cuenta a la vez: si el token estaba
    // registrado en otros usuarios (p. ej. se cambió de cuenta en el mismo
    // teléfono), lo quitamos de ellos para no enviarles notificaciones ajenas.
    await Usuario.updateMany(
      { _id: { $ne: req.usuario._id }, pushTokens: token },
      { $pull: { pushTokens: token } },
    );

    await Usuario.findByIdAndUpdate(req.usuario._id, {
      $addToSet: { pushTokens: token },
    });

    res.json({ message: 'Token de notificaciones registrado' });
  } catch (err) {
    console.error('registrarToken:', err);
    res.status(500).json({ message: 'Error al registrar el token de notificaciones' });
  }
};

// ── DELETE /api/notifications/token ───────────────────────────────────────────
// Elimina el token del dispositivo (logout / desactivar notificaciones).
const eliminarToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token requerido' });
    }

    await Usuario.findByIdAndUpdate(req.usuario._id, {
      $pull: { pushTokens: token },
    });

    res.json({ message: 'Token de notificaciones eliminado' });
  } catch (err) {
    console.error('eliminarToken:', err);
    res.status(500).json({ message: 'Error al eliminar el token de notificaciones' });
  }
};

module.exports = { registrarToken, eliminarToken };
