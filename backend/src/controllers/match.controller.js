const mongoose = require('mongoose');
const Match    = require('../models/match.model');
const Mensaje  = require('../models/mensaje.model');
const Usuario  = require('../models/usuario.model');
const Restaurante = require('../models/restaurante.model');
const { getIO } = require('../socket');

// ── Helpers ─────────────────────────────────────────────────────────────
const getDiaSugerido = () => {
  const dias = ['Sábado', 'Viernes', 'Domingo'];
  const horas = ['7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];
  const dia = dias[Math.floor(Math.random() * dias.length)];
  const hora = horas[Math.floor(Math.random() * horas.length)];
  return `${dia} ${hora}`;
};

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
      }
      await match.save();

      // ── Notificaciones en tiempo real ─────────────────────────────────
      try {
        const io = getIO();
        const yo = await Usuario.findById(yoId).select('first_name username profile_picture').lean();
        const yoNombre = yo?.first_name || yo?.username || 'Alguien';
        const yoFoto   = yo?.profile_picture?.url || yo?.profile_picture || null;

        if (hayMutuo) {
          const matchPayload = {
            matchId:    match._id,
            fromId:     String(yoId),
            fromName:   yoNombre,
            fromPhoto:  yoFoto,
          };
          io.to(`user:${String(targetId)}`).emit('match:nuevo', matchPayload);
          io.to(`user:${String(yoId)}`).emit('match:nuevo', {
            ...matchPayload,
            fromId:   String(targetId),
          });
        } else {
          io.to(`user:${String(targetId)}`).emit('like:recibido', {
            fromId:   String(yoId),
            fromName: yoNombre,
            fromPhoto: yoFoto,
          });
        }
      } catch (socketErr) {
        console.warn('Socket notify skip:', socketErr.message);
      }
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

    if (!match.recomendacion?.restauranteId) {
      return res.status(400).json({ message: 'No hay recomendación de cita activa' });
    }

    // Determinar si soy user1 o user2 basado en el orden del array usuarios
    if (match.usuarios[0].equals(yoId)) {
      match.recomendacion.user1Acepta = true;
    } else if (match.usuarios[1].equals(yoId)) {
      match.recomendacion.user2Acepta = true;
    } else {
      return res.status(403).json({ message: 'No eres parte de este match' });
    }

    // Si ambos aceptan, el estado pasa a 'aceptada' y notificar al asociado
    if (match.recomendacion.user1Acepta && match.recomendacion.user2Acepta) {
      match.recomendacion.estado = 'aceptada';

      // Notificar al asociado vía socket
      try {
        const io = getIO();
        const pareja = await Usuario.find({ _id: { $in: match.usuarios } })
          .select('first_name last_name username profile_picture')
          .lean();

        const restaurante = await Restaurante.findById(match.recomendacion.restauranteId)
          .select('nombre')
          .lean();

        io.to(`user:${String(match.recomendacion.asociadoId)}`).emit('cita:confirmada', {
          matchId: match._id,
          pareja: pareja.map(u => ({
            id: u._id,
            nombre: u.first_name + (u.last_name ? ` ${u.last_name}` : ''),
            foto: u.profile_picture?.url || null,
          })),
          restaurante: restaurante?.nombre || '',
          fechaSugerida: match.recomendacion.fechaSugerida,
        });
      } catch (socketErr) {
        console.warn('Socket cita:confirmada skip:', socketErr.message);
      }
    }

    await match.save();

    // Notificar al otro usuario del match que alguien aceptó
    try {
      const io = getIO();
      const otroId = match.usuarios.find(u => !u.equals(yoId));
      const yo = await Usuario.findById(yoId).select('first_name').lean();

      io.to(`user:${String(otroId)}`).emit('cita:estado-actualizado', {
        matchId: match._id,
        aceptoPor: yo?.first_name || 'Tu match',
        recomendacion: match.recomendacion,
      });
    } catch (socketErr) {
      console.warn('Socket cita:estado skip:', socketErr.message);
    }

    res.json({ message: 'Cita aceptada', recomendacion: match.recomendacion });
  } catch (err) {
    console.error('aceptarCita:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/matches/:id/reject-date ──────────────────────────────
const rechazarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const yoId = req.usuario._id;

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match no encontrado' });

    if (!match.usuarios.some(u => u.equals(yoId))) {
      return res.status(403).json({ message: 'No eres parte de este match' });
    }

    if (!match.recomendacion?.restauranteId) {
      return res.status(400).json({ message: 'No hay recomendación de cita activa' });
    }

    match.recomendacion.estado = 'rechazada';
    await match.save();

    // Notificar al otro usuario en tiempo real
    try {
      const io = getIO();
      const otroId = match.usuarios.find(u => !u.equals(yoId));
      io.to(`user:${String(otroId)}`).emit('cita:estado-actualizado', {
        matchId: match._id,
        recomendacion: match.recomendacion,
      });
    } catch (socketErr) {
      console.warn('Socket rechazarCita skip:', socketErr.message);
    }

    res.json({ message: 'Cita rechazada', recomendacion: match.recomendacion });
  } catch (err) {
    console.error('rechazarCita:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/matches/:id/suggest-new-place ────────────────────────
const sugerirNuevoLugar = async (req, res) => {
  try {
    const { id } = req.params;
    const yoId = req.usuario._id;

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match no encontrado' });

    if (!match.usuarios.some(u => u.equals(yoId))) {
      return res.status(403).json({ message: 'No eres parte de este match' });
    }

    // Buscar restaurante diferente al actual
    const filtro = { activo: true };
    if (match.recomendacion?.restauranteId) {
      filtro._id = { $ne: match.recomendacion.restauranteId };
    }

    const restaurantes = await Restaurante.find(filtro).lean();
    if (restaurantes.length === 0) {
      return res.status(404).json({ message: 'No hay otros restaurantes disponibles' });
    }

    const nuevoRestaurante = restaurantes[Math.floor(Math.random() * restaurantes.length)];
    const fechaSugerida = getDiaSugerido();

    match.recomendacion = {
      restauranteId: nuevoRestaurante._id,
      asociadoId: nuevoRestaurante.asociadoId,
      estado: 'pendiente',
      user1Acepta: false,
      user2Acepta: false,
      fechaSugerida,
      sugeridaEn: new Date(),
    };
    await match.save();

    // Notificar a ambos usuarios con nueva sugerencia
    try {
      const io = getIO();
      const payload = {
        matchId: match._id,
        usuarios: match.usuarios.map(String),
        restaurante: {
          id: nuevoRestaurante._id,
          nombre: nuevoRestaurante.nombre,
          descripcion: nuevoRestaurante.descripcion,
          categoria: nuevoRestaurante.categoria,
          ambiente: nuevoRestaurante.ambiente,
          direccion: nuevoRestaurante.direccion,
          foto_portada: nuevoRestaurante.foto_portada,
          fotos: nuevoRestaurante.fotos?.slice(0, 5) || [],
          precio_promedio: nuevoRestaurante.precio_promedio,
          horario: nuevoRestaurante.horario,
          menu: nuevoRestaurante.menu?.slice(0, 3) || [],
        },
        sugerencia: { fecha: fechaSugerida },
        recomendacion: match.recomendacion,
      };

      for (const uid of match.usuarios) {
        io.to(`user:${String(uid)}`).emit('cita:nueva-sugerencia', payload);
      }
    } catch (socketErr) {
      console.warn('Socket nueva-sugerencia skip:', socketErr.message);
    }

    res.json({
      message: 'Nuevo lugar sugerido',
      restaurante: nuevoRestaurante,
      recomendacion: match.recomendacion,
    });
  } catch (err) {
    console.error('sugerirNuevoLugar:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


// ── POST /api/matches/superlike/:targetId ───────────────────────────
const SUPERLIKE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

const darSuperLike = async (req, res) => {
  try {
    const yoId     = req.usuario._id;
    const targetId = new mongoose.Types.ObjectId(req.params.targetId);

    if (yoId.equals(targetId)) {
      return res.status(400).json({ message: 'No puedes darte superlike a ti mismo' });
    }

    // Verificar cooldown semanal
    const yo = await Usuario.findById(yoId).select('lastSuperlikeUsed');
    if (yo?.lastSuperlikeUsed) {
      const elapsed = Date.now() - new Date(yo.lastSuperlikeUsed).getTime();
      if (elapsed < SUPERLIKE_COOLDOWN_MS) {
        const diasRestantes = Math.ceil((SUPERLIKE_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
        return res.status(429).json({
          message: `Superlike disponible en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`,
          diasRestantes,
        });
      }
    }

    const ids   = [yoId, targetId].sort();
    let   match = await Match.findOne({ usuarios: { $all: ids, $size: 2 } });

    if (!match) {
      match = await Match.create({
        usuarios: ids,
        likes:    [{ de: yoId, para: targetId, tipo: 'superlike' }],
      });
    } else {
      const yaLikeo = match.likes.some(l => l.de.equals(yoId) && l.para.equals(targetId));
      if (yaLikeo) {
        return res.status(400).json({ message: 'Ya le diste like a este usuario' });
      }

      match.likes.push({ de: yoId, para: targetId, tipo: 'superlike' });

      const hayMutuo = match.likes.some(l => l.de.equals(targetId) && l.para.equals(yoId));
      if (hayMutuo) {
        match.esMatch    = true;
        match.fechaMatch = new Date();
      }
      await match.save();

      try {
        const io = getIO();
        const yoData   = await Usuario.findById(yoId).select('first_name username profile_picture').lean();
        const yoNombre = yoData?.first_name || yoData?.username || 'Alguien';
        const yoFoto   = yoData?.profile_picture?.url || yoData?.profile_picture || null;

        if (hayMutuo) {
          const matchPayload = { matchId: match._id, fromId: String(yoId), fromName: yoNombre, fromPhoto: yoFoto };
          io.to(`user:${String(targetId)}`).emit('match:nuevo', matchPayload);
          io.to(`user:${String(yoId)}`).emit('match:nuevo', { ...matchPayload, fromId: String(targetId) });
        } else {
          io.to(`user:${String(targetId)}`).emit('superlike:recibido', {
            fromId: String(yoId), fromName: yoNombre, fromPhoto: yoFoto,
          });
        }
      } catch (socketErr) {
        console.warn('Socket superlike skip:', socketErr.message);
      }
    }

    // Registrar la fecha de uso
    await Usuario.findByIdAndUpdate(yoId, { lastSuperlikeUsed: new Date() });

    res.json({
      esMatch: match.esMatch,
      matchId: match._id,
      recomendacion: match.recomendacion || null,
      message: match.esMatch ? '🎉 ¡Es un match!' : '⭐ Superlike enviado',
    });
  } catch (err) {
    console.error('darSuperLike:', err);
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
const listarMatches = async (req, res) => {
  try {
    const yoId = req.usuario._id;

    const matches = await Match.find({ usuarios: yoId, esMatch: true })
      .populate('usuarios', 'first_name last_name username profile_picture is_verified birth_date')
      .sort({ fechaMatch: -1 })
      .lean();

    const promesas = matches.map(async (m) => {
      const otroUsuario = m.usuarios.find(u => u && !u._id.equals(yoId));
      if (!otroUsuario) return null;

      const lastMsg = await Mensaje.findOne({ matchId: m._id })
        .sort({ createdAt: -1 })
        .lean();

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
        streak: m.streak || 0,
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

module.exports = { darLike, darSuperLike, darDislike, listarMatches, aceptarCita, rechazarCita, sugerirNuevoLugar };
