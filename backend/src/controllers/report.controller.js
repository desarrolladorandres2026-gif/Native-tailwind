const mongoose = require('mongoose');
const Reporte  = require('../models/reporte_model');
const Match    = require('../models/match.model');
const Usuario  = require('../models/usuario.model');

// ── POST /api/report/:userId ─────────────────────────────────────────────────
// Body: { motivo, descripcion? }
const reportarUsuario = async (req, res) => {
  try {
    const yoId      = req.usuario._id;
    const targetId  = new mongoose.Types.ObjectId(req.params.userId);
    const { motivo, descripcion = '' } = req.body;

    if (yoId.equals(targetId)) {
      return res.status(400).json({ message: 'No puedes reportarte a ti mismo' });
    }

    const motivosValidos = [
      'spam', 'contenido_inapropiado', 'comportamiento_ofensivo',
      'perfil_falso', 'acoso', 'otro',
    ];
    if (!motivosValidos.includes(motivo)) {
      return res.status(400).json({ message: 'Motivo de reporte inválido' });
    }

    // Guardar reporte (falla silenciosamente si ya existe por el índice único)
    await Reporte.findOneAndUpdate(
      { reportadoPor: yoId, reportado: targetId },
      { motivo, descripcion: descripcion.trim().slice(0, 500), estado: 'pendiente' },
      { upsert: true, new: true }
    );

    // Bloquear automáticamente: eliminar likes mutuos / match entre ellos
    await Match.deleteOne({
      usuarios: { $all: [yoId, targetId], $size: 2 },
    });

    res.json({ message: 'Usuario reportado correctamente. Gracias por tu reporte.' });
  } catch (err) {
    console.error('reportarUsuario:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/report/mis-reportes ─────────────────────────────────────────────
// Para el admin o para ver si ya reporté a alguien
const misReportes = async (req, res) => {
  try {
    const reportes = await Reporte.find({ reportadoPor: req.usuario._id })
      .populate('reportado', 'first_name username profile_picture')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reportes });
  } catch (err) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { reportarUsuario, misReportes };