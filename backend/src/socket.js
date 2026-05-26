const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Mensaje = require('./models/mensaje.model');
const Match = require('./models/match.model');
const Usuario = require('./models/usuario.model');
const Restaurante = require('./models/restaurante.model');

let io;

// ── Mapa de presencia en memoria ─────────────────────────────────────────────
// userId (string) → Date de conexión
const onlineUsers = new Map();

// ── Helper: generar día/hora sugerida ────────────────────────────────────────
const getDiaSugerido = () => {
  const dias = ['Sábado', 'Viernes', 'Domingo'];
  const horas = ['7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];
  const dia = dias[Math.floor(Math.random() * dias.length)];
  const hora = horas[Math.floor(Math.random() * horas.length)];
  return `${dia} ${hora}`;
};

const initSocket = (server) => {
  io = new Server(server, { cors: { origin: '*' } });

  // ── Autenticación ─────────────────────────────────────────────────────────
  // El cliente debe enviar: socket.auth = { token: '<access_token>' }
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuarioId = decoded.id;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const usuarioId = socket.usuarioId;
    console.log(`🔌 Conectado: ${usuarioId}`);

    // ── Registrar presencia ───────────────────────────────────────────────
    onlineUsers.set(usuarioId, new Date());

    // Sala personal: user:<id>
    socket.join(`user:${usuarioId}`);

    // Notificar a todos los demás que este usuario está en línea
    socket.broadcast.emit('usuario:online', { userId: usuarioId });

    // ── Consulta puntual de presencia ─────────────────────────────────────
    // Cliente emite: presencia:estado  { userId: string }
    // Servidor emite: presencia:respuesta  { userId, online, lastSeen }
    socket.on('presencia:estado', ({ userId }) => {
      const since = onlineUsers.get(userId);
      socket.emit('presencia:respuesta', {
        userId,
        online: !!since,
        lastSeen: since ?? null,
      });
    });

    // ── Enviar mensaje ────────────────────────────────────────────────────
    // Cliente emite: mensaje:enviar  { paraId: string, content: string }
    // Servidor emite a ambos: mensaje:nuevo  con el mensaje creado
    socket.on('mensaje:enviar', async ({ paraId, content }) => {
      try {
        const yoId = new mongoose.Types.ObjectId(usuarioId);
        const otroId = new mongoose.Types.ObjectId(paraId);

        const ids = [yoId, otroId].sort();
        const match = await Match.findOne({ usuarios: { $all: ids, $size: 2 }, esMatch: true });

        if (!match) {
          socket.emit('error', { message: 'No hay match con este usuario' });
          return;
        }

        const mensaje = await Mensaje.create({
          matchId: match._id,
          sender_id: yoId,
          receiver_id: otroId,
          content: content?.trim(),
        });

        // Enriquecer payload con datos del remitente para las notificaciones
        const sender = await Usuario.findById(yoId)
          .select('first_name username profile_picture')
          .lean();

        const payload = {
          ...mensaje.toJSON(),
          senderName:  sender?.first_name || sender?.username || 'Alguien',
          senderPhoto: sender?.profile_picture?.url || sender?.profile_picture || null,
        };
        io.to(`user:${paraId}`)
          .to(`user:${usuarioId}`)
          .emit('mensaje:nuevo', payload);

        // ── Lógica de sugerencia de primera cita al 5to mensaje ───────────
        // Solo si no hay una recomendación activa ya
        if (!match.recomendacion?.restauranteId) {
          const totalMensajes = await Mensaje.countDocuments({ matchId: match._id });

          if (totalMensajes === 5) {
            // Buscar un restaurante activo con al menos nombre
            const restaurantes = await Restaurante.find({
              activo: true,
              nombre: { $ne: '' },
            }).lean();

            if (restaurantes.length > 0) {
              const restaurante = restaurantes[Math.floor(Math.random() * restaurantes.length)];
              const fechaSugerida = getDiaSugerido();

              // Guardar la recomendación en el match
              match.recomendacion = {
                restauranteId: restaurante._id,
                asociadoId: restaurante.asociadoId,
                estado: 'pendiente',
                user1Acepta: false,
                user2Acepta: false,
                fechaSugerida,
                sugeridaEn: new Date(),
              };
              await match.save();

              // Obtener nombres de ambos usuarios para el mensaje bonito
              const usuarios = await Usuario.find({ _id: { $in: match.usuarios } })
                .select('first_name')
                .lean();

              const nombres = usuarios.map(u => u.first_name).filter(Boolean);

              // Emitir sugerencia a ambos usuarios
              const sugerenciaPayload = {
                matchId: String(match._id),
                restaurante: {
                  id: String(restaurante._id),
                  nombre: restaurante.nombre,
                  descripcion: restaurante.descripcion || '',
                  categoria: restaurante.categoria || '',
                  ambiente: restaurante.ambiente || '',
                  direccion: restaurante.direccion || '',
                  foto_portada: restaurante.foto_portada || null,
                  fotos: (restaurante.fotos || []).slice(0, 5),
                  precio_promedio: restaurante.precio_promedio || '',
                  horario: restaurante.horario || '',
                  menu: (restaurante.menu || []).slice(0, 3),
                },
                sugerencia: {
                  fecha: fechaSugerida,
                  mensaje: nombres.length === 2
                    ? `¡${nombres[0]} y ${nombres[1]} se la llevan muy bien! 💕`
                    : '¡Se la llevan muy bien! 💕',
                },
                recomendacion: match.recomendacion,
              };

              io.to(`user:${String(match.usuarios[0])}`)
                .to(`user:${String(match.usuarios[1])}`)
                .emit('cita:sugerencia', sugerenciaPayload);

              console.log(`💑 Sugerencia de cita enviada para match ${match._id} → ${restaurante.nombre}`);
            }
          }
        }

      } catch (err) {
        console.error('socket mensaje:enviar:', err);
        socket.emit('error', { message: 'Error al enviar mensaje' });
      }
    });

    // ── Marcar mensajes como leídos ───────────────────────────────────────
    // Cliente emite: mensajes:leer  { deId: string }
    socket.on('mensajes:leer', async ({ deId }) => {
      try {
        const yoId = new mongoose.Types.ObjectId(usuarioId);
        const ids = [yoId, new mongoose.Types.ObjectId(deId)].sort();
        const match = await Match.findOne({ usuarios: { $all: ids, $size: 2 } });
        if (match) {
          await Mensaje.updateMany(
            { matchId: match._id, receiver_id: yoId, is_read: false },
            { is_read: true }
          );
        }
      } catch (err) {
        console.error('socket mensajes:leer:', err);
      }
    });

    // ── Sistema de Llamadas ───────────────────────────────────────────────────
    // Cliente (llamante) emite: call:request { paraId, signalData, isVideo }
    socket.on('call:request', ({ paraId, signalData, isVideo, callerName, callerPhoto }) => {
      console.log(`📞 [CALL] De: ${usuarioId} → Para: ${paraId} | Video: ${isVideo}`);

      // Diagnóstico: ver cuántos sockets hay en la sala del receptor
      const roomName = `user:${paraId}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      const socketsEnSala = room ? room.size : 0;
      console.log(`📡 [CALL] Sala "${roomName}" tiene ${socketsEnSala} socket(s) conectados`);

      if (socketsEnSala === 0) {
        console.warn(`⚠️ [CALL] El receptor ${paraId} NO está conectado al socket. La llamada no llegará.`);
        // Notificar al llamante que el receptor no está disponible
        socket.emit('call:unavailable', { paraId, reason: 'offline' });
        return;
      }

      // Resolver nombre/foto: primero del payload, luego del auth del socket
      const resolvedName  = callerName  || socket.handshake.auth?.name  || 'Usuario';
      const resolvedPhoto = callerPhoto || socket.handshake.auth?.photo || null;

      io.to(roomName).emit('call:incoming', {
        fromId: usuarioId,
        signalData,
        isVideo,
        callerName: resolvedName,
        callerPhoto: resolvedPhoto,
      });

      console.log(`✅ [CALL] call:incoming emitido a ${roomName} con nombre "${resolvedName}"`);
    });

    // Cliente (receptor) emite: call:accept { paraId, signalData }
    socket.on('call:accept', ({ paraId, signalData }) => {
      console.log(`✅ Llamada aceptada por ${usuarioId} para ${paraId}`);
      io.to(`user:${paraId}`).emit('call:accepted', {
        signalData,
        answererId: usuarioId
      });
    });

    // Cliente (receptor) emite: call:reject { paraId }
    socket.on('call:reject', ({ paraId }) => {
      console.log(`❌ Llamada rechazada por ${usuarioId} para ${paraId}`);
      io.to(`user:${paraId}`).emit('call:rejected', { fromId: usuarioId });
    });

    // Cliente emite: call:signal { paraId, signalData }
    // Usado para intercambio de ICE candidates y re-negociación
    socket.on('call:signal', ({ paraId, signalData }) => {
      io.to(`user:${paraId}`).emit('call:signal', {
        fromId: usuarioId,
        signalData
      });
    });

    // Cliente emite: call:end { paraId }
    socket.on('call:end', ({ paraId }) => {
      console.log(`📵 Llamada terminada por ${usuarioId}`);
      io.to(`user:${paraId}`).emit('call:ended', { fromId: usuarioId });
    });

    // ── Desconexión ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Desconectado: ${usuarioId}`);
      onlineUsers.delete(usuarioId);

      // Notificar a todos con la hora de última conexión
      socket.broadcast.emit('usuario:offline', {
        userId: usuarioId,
        lastSeen: new Date(),
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io no inicializado');
  return io;
};

// Utilidad para controllers: saber si un userId está en línea ahora
const isOnline = (userId) => onlineUsers.has(String(userId));

module.exports = { initSocket, getIO, isOnline, onlineUsers };
