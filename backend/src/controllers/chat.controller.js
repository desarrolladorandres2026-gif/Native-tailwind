const mongoose    = require('mongoose');
const Mensaje     = require('../models/mensaje.model');
const Match       = require('../models/match.model');
const Restaurante = require('../models/restaurante.model');
const Usuario     = require('../models/usuario.model');
const { uploadBuffer } = require('../helpers/cloudinary');
const { contienePalabraOfensiva } = require('../helpers/moderador');
const { enviarPushAUsuario } = require('../helpers/push');
const { isOnline } = require('../socket');

// Verifica que haya match entre yoId y otroId
const getMatch = async (yoId, otroId) => {
  const ids = [yoId, otroId].sort();
  return Match.findOne({ usuarios: { $all: ids, $size: 2 }, esMatch: true });
};

// ── GET /api/chat/:userId ────────────────────────────────────────────
// ChatScreen llama a esto con el userId del otro usuario.
// Devuelve array de mensajes con campos: id, sender_id, receiver_id,
// content, is_read, created_at
const obtenerMensajes = async (req, res) => {
  try {
    const yoId   = req.usuario._id;
    const otroId = new mongoose.Types.ObjectId(req.params.userId);
    const { pagina = 1, limite = 50 } = req.query;

    const match = await getMatch(yoId, otroId);
    if (!match) {
      return res.status(403).json({ message: 'No hay match entre estos usuarios' });
    }

    // Soft-delete por usuario: ocultar los mensajes anteriores a la eliminación
    const filtroMensajes = { matchId: match._id };
    const borrado = match.eliminadaPor?.find(e => e.usuario && e.usuario.equals(yoId));
    if (borrado) filtroMensajes.createdAt = { $gt: borrado.fecha };

    const mensajes = await Mensaje.find(filtroMensajes)
      .sort({ createdAt: 1 })
      .skip((pagina - 1) * Number(limite))
      .limit(Number(limite));

    // Marcar como leídos los mensajes que me enviaron a mí
    await Mensaje.updateMany(
      { matchId: match._id, receiver_id: yoId, is_read: false },
      { is_read: true }
    );

    // Incluir sugerencia de cita activa para que persista al reabrir el chat
    let recomendacion = null;
    if (match.recomendacion?.restauranteId && match.recomendacion.estado !== 'rechazada') {
      const restaurante = await Restaurante.findById(match.recomendacion.restauranteId).lean();
      if (restaurante) {
        recomendacion = {
          matchId:  String(match._id),
          usuarios: match.usuarios.map(u => String(u)),
          restaurante: {
            id:             String(restaurante._id),
            nombre:         restaurante.nombre,
            descripcion:    restaurante.descripcion    || '',
            categoria:      restaurante.categoria      || '',
            ambiente:       restaurante.ambiente       || '',
            direccion:      restaurante.direccion      || '',
            foto_portada:   restaurante.foto_portada   || null,
            fotos:          (restaurante.fotos         || []).slice(0, 5),
            precio_promedio: restaurante.precio_promedio || '',
            horario:        restaurante.horario        || '',
            menu:           (restaurante.menu          || []).slice(0, 3),
          },
          sugerencia:    { fecha: match.recomendacion.fechaSugerida },
          recomendacion: match.recomendacion,
        };
      }
    }

    res.json({
      matchId:      match._id,
      mensajes:     mensajes.map(m => m.toJSON()),
      recomendacion,
    });
  } catch (err) {
    console.error('obtenerMensajes:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/chat/:userId ───────────────────────────────────────────
// Fallback HTTP (lo principal va por Socket.io)
const enviarMensaje = async (req, res) => {
  try {
    const yoId   = req.usuario._id;
    const otroId = new mongoose.Types.ObjectId(req.params.userId);
    const { content } = req.body;  // "content" — nombre que usa el frontend

    if (!content?.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    if (contienePalabraOfensiva(content)) {
      return res.status(400).json({ message: 'Tu mensaje contiene lenguaje inapropiado. Por favor sé respetuoso.' });
    }

    const match = await getMatch(yoId, otroId);
    if (!match) {
      return res.status(403).json({ message: 'No hay match entre estos usuarios' });
    }

    const mensaje = await Mensaje.create({
      matchId:     match._id,
      sender_id:   yoId,
      receiver_id: otroId,
      content:     content.trim(),
    });

    // Push si el receptor está offline (app cerrada).
    if (!isOnline(otroId)) {
      const remitente = await Usuario.findById(yoId)
        .select('first_name username')
        .lean();
      const senderName = remitente?.first_name || remitente?.username || 'Nuevo mensaje';
      const preview = content.trim();
      enviarPushAUsuario(
        String(otroId),
        {
          title: senderName,
          body: preview.length > 120 ? `${preview.slice(0, 117)}…` : preview,
          channelId: 'messages',
          priority: 'high',
          data: { type: 'message', fromId: String(yoId), senderName },
        },
        'notif_messages',
      );
    }

    res.status(201).json({ mensaje: mensaje.toJSON() });
  } catch (err) {
    console.error('enviarMensaje:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── DELETE /api/chat/:userId ─────────────────────────────────────────
// Soft-delete por usuario: oculta el historial previo SOLO para quien lo
// solicita. El otro usuario conserva sus mensajes. Los mensajes que lleguen
// después reaparecen y la conversación vuelve a mostrarse en la lista.
const eliminarConversacion = async (req, res) => {
  try {
    const yoId   = req.usuario._id;
    const otroId = new mongoose.Types.ObjectId(req.params.userId);

    const match = await getMatch(yoId, otroId);
    if (!match) {
      return res.status(403).json({ message: 'No hay match entre estos usuarios' });
    }

    const ahora   = new Date();
    const entrada = match.eliminadaPor.find(e => e.usuario && e.usuario.equals(yoId));
    if (entrada) {
      entrada.fecha = ahora;
    } else {
      match.eliminadaPor.push({ usuario: yoId, fecha: ahora });
    }
    await match.save();

    res.json({ message: 'Conversación eliminada' });
  } catch (err) {
    console.error('eliminarConversacion:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const subirImagen = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ninguna imagen' });
    }
    const { url } = await uploadBuffer(req.file.buffer, {
      folder: `debuta/chats/${req.usuario._id.toString()}`,
    });
    res.status(200).json({ url });
  } catch (err) {
    console.error('subirImagen:', err);
    res.status(500).json({ message: 'Error al subir la imagen', detail: err.message });
  }
};

module.exports = { obtenerMensajes, enviarMensaje, subirImagen, eliminarConversacion };
