/**
 * password.controller.js
 * Flujo completo de recuperación de contraseña:
 *  1. POST /api/password/forgot  → genera código 6 dígitos y envía email
 *  2. POST /api/password/verify  → valida el código (sin resetear aún)
 *  3. POST /api/password/reset   → cambia la contraseña con el código verificado
 */

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const Usuario = require('../models/usuario.model');
const { enviarCorreoReset } = require('../helpers/mailer');

// Genera un código de 6 dígitos
const generarCodigo = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /api/password/forgot ─────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      return res.status(400).json({ message: 'Ingresa un correo válido' });
    }

    const correoNorm = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({ correo: correoNorm })
      .select('+resetPasswordCode +resetPasswordExpires');

    // Siempre responder igual para no exponer si el correo existe o no
    if (!usuario) {
      return res.json({
        message: 'Si ese correo está registrado, recibirás un código en breve.',
      });
    }

    // Generar código y hashearlo
    const code     = generarCodigo();
    console.log(`🔑 [DEBUG/DEV] Código de recuperación generado para ${correoNorm}: ${code}`);
    const hashed   = await bcrypt.hash(code, 10);
    const expires  = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    usuario.resetPasswordCode    = hashed;
    usuario.resetPasswordExpires = expires;
    await usuario.save({ validateBeforeSave: false });

    // Enviar email
    await enviarCorreoReset(correoNorm, usuario.first_name, code);

    res.json({
      message: 'Si ese correo está registrado, recibirás un código en breve.',
    });
  } catch (err) {
    console.error('forgotPassword:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/password/verify ─────────────────────────────────────────────────
// Verifica el código sin cambiar contraseña (para el paso 2 de la UI)
const verifyCode = async (req, res) => {
  try {
    const { correo, code } = req.body;

    if (!correo || !code) {
      return res.status(400).json({ message: 'Correo y código son requeridos' });
    }

    const correoNorm = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({
      correo: correoNorm,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordCode +resetPasswordExpires');

    if (!usuario || !usuario.resetPasswordCode) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    const valido = await bcrypt.compare(code.trim(), usuario.resetPasswordCode);
    if (!valido) {
      return res.status(400).json({ message: 'Código incorrecto' });
    }

    res.json({ message: 'Código verificado correctamente', valido: true });
  } catch (err) {
    console.error('verifyCode:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/password/reset ──────────────────────────────────────────────────
// Valida código y cambia la contraseña
const resetPassword = async (req, res) => {
  try {
    const { correo, code, nuevaPassword } = req.body;

    if (!correo || !code || !nuevaPassword) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener mínimo 6 caracteres' });
    }

    const correoNorm = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({
      correo: correoNorm,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordCode +resetPasswordExpires +password');

    if (!usuario || !usuario.resetPasswordCode) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    const valido = await bcrypt.compare(code.trim(), usuario.resetPasswordCode);
    if (!valido) {
      return res.status(400).json({ message: 'Código incorrecto' });
    }

    // Cambiar contraseña y limpiar campos de reset
    usuario.password             = nuevaPassword; // el pre-save hook la hashea
    usuario.resetPasswordCode    = null;
    usuario.resetPasswordExpires = null;
    await usuario.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('resetPassword:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { forgotPassword, verifyCode, resetPassword };
