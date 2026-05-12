const mongoose = require('mongoose');
const Match    = require('../models/match.model');
const Mensaje  = require('../models/mensaje.model');
const Usuario  = require('../models/usuario.model'); // Importar Usuario para buscar asociados

// ── POST /api/matches/like/:targetId ────────────────────────────────
const darLike = async (req, res) => {
  try {
    const yoId     = req.usuario._id;
    const targetId = new mongoose.Types.ObjectId(req.params.targetId);

    if (yoId.equals(targetId)) {
      return res.status(400).json({ message: 'No puedes darte like a ti mismo' });
    }

    const ids   = [yoId, targetId].sort();
    let   match = await Match.findOne({ usuarios: { $all: ids, $size: 2 } });

    if (!match) {
      match = await Match.create({
        usuarios: ids,
        likes:    [{ de: yoId, para: targetId }],
      });
    } else {
      const yaLikeo = match.likes.some(l => l.de.equals(yoId) && l.para.equals(targetId));
      if (yaLikeo) {
        return res.status(400).json({ message: 'Ya le diste like a este usuario' });
      }

      match.likes.push({ de: yoId, para: targetId });

      const hayMutuo = match.likes.some(l => l.de.equals(targetId) && l.para.equals(yoId));
      if (hayMutuo) {
        match.esMatch    = true;
        match.fechaMatch = new Date();

        // Lógica de recomendación de cita con Asociado (Restaurante)
        const asociados = await Usuario.find({ rol: 'asociado', activo: true });
        if (asociados.length > 0) {
          // Seleccionar uno al azar
          const randomAsociado = asociados[Math.floor(Math.random() * asociados.length)];
          match.recomendacion = {
            asociadoId: randomAsociado._id,
            estado: 'pendiente',
            user1Acepta: false,
            user2Acepta: false,
          };
        }
      }
      await match.save();
    }

    res.json({
      esMatch: match.esMatch,
      matchId: match._id,
      recomendacion: match.recomendacion || null,
      message: match.esMatch ? '🎉 ¡Es un match!' : 'Like enviado',
    });
  } catch (err) {
    console.error('darLike:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/matches/:id/accept-date ──────────────────────────────
const aceptarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const yoId = req.usuario._id;

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match no encontrado' });

    // Determinar si soy user1 o user2 basado en el orden del array usuarios
    if (match.usuarios[0].equals(yoId)) {
      match.recomendacion.user1Acepta = true;
    } else if (match.usuarios[1].equals(yoId)) {
      match.recomendacion.user2Acepta = true;
    } else {
      return res.status(403).json({ message: 'No eres parte de este match' });
    }

    // Si ambos aceptan, el estado pasa a 'aceptada'
    if (match.recomendacion.user1Acepta && match.recomendacion.user2Acepta) {
      match.recomendacion.estado = 'aceptada';
    }

    await match.save();

    res.json({ message: 'Cita aceptada', recomendacion: match.recomendacion });
  } catch (err) {
    console.error('aceptarCita:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


// ── POST /api/matches/dislike/:targetId ─────────────────────────────
const darDislike = async (req, res) => {
  try {
    const yoId     = req.usuario._id;
    const targetId = new mongoose.Types.ObjectId(req.params.targetId);

    if (yoId.equals(targetId)) {
      return res.status(400).json({ message: 'No puedes darte dislike a ti mismo' });
    }

    const ids   = [yoId, targetId].sort();
    let   match = await Match.findOne({ usuarios: { $all: ids, $size: 2 } });

    if (!match) {
      match = await Match.create({
        usuarios: ids,
        likes:    [{ de: yoId, para: targetId, tipo: 'dislike' }],
      });
    } else {
      const yaInteractuo = match.likes.some(l => l.de.equals(yoId));
      if (yaInteractuo) {
        return res.status(400).json({ message: 'Ya has interactuado con este usuario' });
      }
      match.likes.push({ de: yoId, para: targetId, tipo: 'dislike' });
      await match.save();
    }

    res.json({ message: 'Dislike registrado' });
  } catch (err) {
    console.error('darDislike:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/matches ─────────────────────────────────────────────────
// MatchesScreen espera:
// [{ id, matched_user: { id, first_name, username, profile_picture, is_verified },
//    last_message: { id, sender_id, receiver_id, content, created_at, is_read },
//    unread_count }]
const listarMatches = async (req, res) => {
  try {
    const yoId = req.usuario._id;

    const matches = await Match.find({ usuarios: yoId, esMatch: true })
      .populate('usuarios', 'first_name last_name username profile_picture is_verified birth_date')
      .sort({ fechaMatch: -1 })
      .lean();

    // Enriquecer cada match con last_message y unread_count
    const promesas = matches.map(async (m) => {
      // Filtrar usuarios nulos (por si alguno fue eliminado)
      const otroUsuario = m.usuarios.find(u => u && !u._id.equals(yoId));

      if (!otroUsuario) return null;

      // Último mensaje
      const lastMsg = await Mensaje.findOne({ matchId: m._id })
        .sort({ createdAt: -1 })
        .lean();

      // Mensajes no leídos dirigidos a mí
      const unreadCount = await Mensaje.countDocuments({
        matchId: m._id,
        receiver_id: yoId,
        is_read: false,
      });

      return {
        id: m._id,
        matched_user: {
          id: otroUsuario._id,
          first_name: otroUsuario.first_name,
          last_name: otroUsuario.last_name,
          username: otroUsuario.username,
          profile_picture: otroUsuario.profile_picture ?? null,
          is_verified: otroUsuario.is_verified ?? false,
          birth_date: otroUsuario.birth_date ?? null,
        },
        last_message: lastMsg
          ? {
              id: lastMsg._id,
              sender_id: lastMsg.sender_id,
              receiver_id: lastMsg.receiver_id,
              content: lastMsg.content,
              is_read: lastMsg.is_read,
              created_at: lastMsg.createdAt,
            }
          : null,
        unread_count: unreadCount,
        created_at: m.fechaMatch || m.createdAt,
        recomendacion: m.recomendacion || null,
      };
    });

    const resultado = (await Promise.all(promesas)).filter(Boolean);

    res.json({ matches: resultado });
  } catch (err) {
    console.error('listarMatches:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { darLike, darDislike, listarMatches, aceptarCita };
