const bcrypt  = require('bcryptjs');
const Usuario = require('../models/usuario.model');
const { deleteImage } = require('../helpers/cloudinary');
const { enviarCodigoEliminacion } = require('../helpers/mailer');

const generarCodigo = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /api/delete-account/request ─────────────────────────────────────────
// Verifica correo + contraseña y envía código de confirmación
const requestDeletion = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    const correoNorm = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({ correo: correoNorm })
      .select('+password +deleteAccountCode +deleteAccountExpires');

    if (!usuario || !(await usuario.compararPassword(password))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ message: 'Cuenta desactivada' });
    }

    const code    = generarCodigo();
    console.log(`[DELETE-ACCOUNT] Código generado para ${correoNorm}: ${code}`);
    const hashed  = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    usuario.deleteAccountCode    = hashed;
    usuario.deleteAccountExpires = expires;
    await usuario.save({ validateBeforeSave: false });

    try {
      await enviarCodigoEliminacion(correoNorm, usuario.first_name, code);
    } catch (mailErr) {
      console.error('requestDeletion — fallo al enviar email:', mailErr.message);
    }

    res.json({ message: 'Código enviado a tu correo. Expira en 15 minutos.' });
  } catch (err) {
    console.error('requestDeletion:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/delete-account/confirm ─────────────────────────────────────────
// Valida código y elimina la cuenta permanentemente
const confirmDeletion = async (req, res) => {
  try {
    const { correo, code } = req.body;

    if (!correo || !code) {
      return res.status(400).json({ message: 'Correo y código son obligatorios' });
    }

    const correoNorm = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({
      correo: correoNorm,
      deleteAccountExpires: { $gt: new Date() },
    }).select('+deleteAccountCode +deleteAccountExpires');

    if (!usuario || !usuario.deleteAccountCode) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    const valido = await bcrypt.compare(code.trim(), usuario.deleteAccountCode);
    if (!valido) {
      return res.status(400).json({ message: 'Código incorrecto' });
    }

    // Eliminar imágenes de Cloudinary
    const publicIds = [];
    if (usuario.profile_picture?.public_id) publicIds.push(usuario.profile_picture.public_id);
    if (usuario.cover_photo?.public_id)      publicIds.push(usuario.cover_photo.public_id);
    if (usuario.photos?.length)              usuario.photos.forEach(p => publicIds.push(p.public_id));
    await Promise.all(publicIds.map(id => deleteImage(id)));

    // Eliminar el documento del usuario
    await Usuario.deleteOne({ _id: usuario._id });

    res.json({ message: 'Tu cuenta ha sido eliminada permanentemente.' });
  } catch (err) {
    console.error('confirmDeletion:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { requestDeletion, confirmDeletion };
