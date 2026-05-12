const mongoose = require('mongoose');
const Match    = require('../models/match.model');

// ── GET /api/likes ───────────────────────────────────────────────────────────
// Devuelve los usuarios que me han dado like pero yo aún NO les he dado like
// (esMatch = false garantiza que todavía no hay match mutuo confirmado)
const likesRecibidos = async (req, res) => {
  try {
    const yoId = new mongoose.Types.ObjectId(req.usuario._id);

    // Buscar matches donde:
    //   1. yo estoy en el array de usuarios
    //   2. todavía no es match mutuo (esMatch = false)
    //   3. alguien me dio like a mí     → $elemMatch: { para: yoId }
    //   4. yo NO les he dado like aún   → $not $elemMatch: { de: yoId }
    // Usamos $and para aplicar dos condiciones sobre el mismo campo 'likes'
    const matches = await Match.find({
      usuarios: yoId,
      esMatch:  false,
      $and: [
        { likes: { $elemMatch: { para: yoId } } },           // alguien me dio like
        { likes: { $not: { $elemMatch: { de: yoId } } } },   // yo NO he dado like
      ],
    })
      .populate(
        'usuarios',
        'first_name last_name username profile_picture birth_date is_verified ciudad'
      )
      .lean();

    const resultado = matches
      .map(m => {
        // Encontrar al otro usuario (el que me dio like)
        const quien = m.usuarios.find(
          u => u._id.toString() !== yoId.toString()
        );
        if (!quien) return null;

        // Verificar que el like fue de ese usuario específico hacia mí
        const like = m.likes.find(
          l =>
            l.de.toString()   === quien._id.toString() &&
            l.para.toString() === yoId.toString()
        );
        if (!like) return null;

        return {
          matchId:  m._id.toString(),
          // Normalizar _id → id para que el frontend acceda a usuario.id
          usuario: {
            ...quien,
            id: quien._id.toString(),
          },
          liked_at: like.createdAt ?? m.createdAt,
        };
      })
      .filter(Boolean);

    res.json({ likes: resultado, total: resultado.length });
  } catch (err) {
    console.error('likesRecibidos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { likesRecibidos };