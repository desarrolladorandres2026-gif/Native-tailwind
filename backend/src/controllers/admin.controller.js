const mongoose = require('mongoose');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const Usuario   = require('../models/usuario.model');
const Reporte   = require('../models/reporte_model');
const Match     = require('../models/match.model');
const Mensaje   = require('../models/mensaje.model');
const { isOnline } = require('../socket');

// ─── LOGIN DEL PANEL ADMIN ────────────────────────────────────────────────────
// POST /api/admin/login  (ruta pública, sin middleware de auth)
const loginAdmin = async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ message: 'Correo y contraseña requeridos' });
    }

    const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() })
      .select('+password');

    if (!usuario || usuario.rol !== 'admin') {
      return res.status(401).json({ message: 'Credenciales inválidas o sin permisos de admin' });
    }
    if (!usuario.activo) {
      return res.status(403).json({ message: 'Cuenta desactivada' });
    }

    const valida = await bcrypt.compare(password, usuario.password);
    if (!valida) {
      return res.status(401).json({ message: 'Credenciales inválidas o sin permisos de admin' });
    }

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: {
        id:         usuario._id,
        first_name: usuario.first_name,
        correo:     usuario.correo,
        rol:        usuario.rol,
      },
    });
  } catch (err) {
    console.error('loginAdmin:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── STATS DEL DASHBOARD ──────────────────────────────────────────────────────
// GET /api/admin/stats
const obtenerStats = async (req, res) => {
  try {
    const ahora    = new Date();
    const hoy      = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const semana   = new Date(ahora); semana.setDate(ahora.getDate() - 7);
    const mes      = new Date(ahora); mes.setDate(ahora.getDate() - 30);

    const [
      totalUsuarios,
      usuariosHoy,
      usuariosSemana,
      usuariosMes,
      totalMatches,
      matchesHoy,
      totalMensajes,
      reportesPendientes,
      totalAsociados,
      usuariosActivos,
      usuariosInactivos,
    ] = await Promise.all([
      Usuario.countDocuments(),
      Usuario.countDocuments({ createdAt: { $gte: hoy } }),
      Usuario.countDocuments({ createdAt: { $gte: semana } }),
      Usuario.countDocuments({ createdAt: { $gte: mes } }),
      Match.countDocuments({ esMatch: true }),
      Match.countDocuments({ esMatch: true, fechaMatch: { $gte: hoy } }),
      Mensaje.countDocuments(),
      Reporte.countDocuments({ estado: 'pendiente' }),
      Usuario.countDocuments({ rol: 'asociado', activo: true }),
      Usuario.countDocuments({ activo: true }),
      Usuario.countDocuments({ activo: false }),
    ]);

    // Usuarios online desde el mapa en memoria de socket.js
    // Contamos los IDs que están en el Map de onlineUsers
    let usuariosOnline = 0;
    try {
      // Obtenemos el count dinámicamente desde el módulo socket
      const { onlineUsers } = require('../socket');
      usuariosOnline = onlineUsers ? onlineUsers.size : 0;
    } catch {
      usuariosOnline = 0;
    }

    res.json({
      totalUsuarios,
      usuariosHoy,
      usuariosSemana,
      usuariosMes,
      totalMatches,
      matchesHoy,
      totalMensajes,
      reportesPendientes,
      totalAsociados,
      usuariosActivos,
      usuariosInactivos,
      usuariosOnline,
    });
  } catch (err) {
    console.error('obtenerStats:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── DATOS DE CRECIMIENTO PARA GRÁFICAS ──────────────────────────────────────
// GET /api/admin/growth?days=30
const obtenerCrecimiento = async (req, res) => {
  try {
    const dias = parseInt(req.query.days) || 30;
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    // Registros por día
    const registrosPorDia = await Usuario.aggregate([
      { $match: { createdAt: { $gte: desde } } },
      {
        $group: {
          _id: {
            year:  { $year:  '$createdAt' },
            month: { $month: '$createdAt' },
            day:   { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Distribución por género
    const porGenero = await Usuario.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Distribución por país
    const porPais = await Usuario.aggregate([
      { $match: { pais: { $ne: '' } } },
      { $group: { _id: '$pais', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Distribución por ciudad
    const porCiudad = await Usuario.aggregate([
      { $match: { ciudad: { $ne: '' } } },
      { $group: { _id: '$ciudad', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Reportes por motivo
    const reportesPorMotivo = await Reporte.aggregate([
      { $group: { _id: '$motivo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Auth providers
    const porProveedor = await Usuario.aggregate([
      { $group: { _id: '$auth_provider', count: { $sum: 1 } } },
    ]);

    res.json({
      registrosPorDia,
      porGenero,
      porPais,
      porCiudad,
      reportesPorMotivo,
      porProveedor,
    });
  } catch (err) {
    console.error('obtenerCrecimiento:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── OBTENER TODOS LOS USUARIOS (paginado + filtros) ─────────────────────────
// GET /api/admin/users?page=1&limit=20&search=&rol=&activo=
const obtenerUsuarios = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const search = req.query.search?.trim() || '';
    const rol    = req.query.rol    || '';
    const activo = req.query.activo || '';

    const filtro = {};
    if (search) {
      filtro.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name:  { $regex: search, $options: 'i' } },
        { username:   { $regex: search, $options: 'i' } },
        { correo:     { $regex: search, $options: 'i' } },
      ];
    }
    if (rol)    filtro.rol    = rol;
    if (activo !== '') filtro.activo = activo === 'true';

    const [usuarios, total] = await Promise.all([
      Usuario.find(filtro)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Usuario.countDocuments(filtro),
    ]);

    // Añadir flag online en tiempo real
    const usuariosConOnline = usuarios.map(u => ({
      ...u,
      online: isOnline(u._id),
    }));

    res.json({
      usuarios: usuariosConOnline,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('obtenerUsuarios:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── OBTENER PERFIL COMPLETO DE UN USUARIO ───────────────────────────────────
// GET /api/admin/users/:id
const obtenerUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .select('-password')
      .lean();
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const [totalMatches, totalMensajes, totalReportes] = await Promise.all([
      Match.countDocuments({ usuarios: usuario._id, esMatch: true }),
      Mensaje.countDocuments({ $or: [{ sender_id: usuario._id }, { receiver_id: usuario._id }] }),
      Reporte.countDocuments({ reportado: usuario._id }),
    ]);

    res.json({
      usuario: {
        ...usuario,
        online: isOnline(usuario._id),
      },
      stats: { totalMatches, totalMensajes, totalReportes },
    });
  } catch (err) {
    console.error('obtenerUsuario:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── CAMBIAR ROL ──────────────────────────────────────────────────────────────
// PUT /api/admin/users/:id/role
const cambiarRol = async (req, res) => {
  try {
    const { id }  = req.params;
    const { rol } = req.body;

    if (!['user', 'admin', 'asociado'].includes(rol)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    const usuario = await Usuario.findByIdAndUpdate(id, { rol }, { new: true }).select('-password');
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Rol actualizado exitosamente', usuario });
  } catch (err) {
    console.error('cambiarRol:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── ACTIVAR / DESACTIVAR CUENTA ─────────────────────────────────────────────
// PUT /api/admin/users/:id/toggle
const toggleUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    usuario.activo = !usuario.activo;
    await usuario.save();

    res.json({
      message: `Cuenta ${usuario.activo ? 'activada' : 'desactivada'} correctamente`,
      activo: usuario.activo,
    });
  } catch (err) {
    console.error('toggleUsuario:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── ELIMINAR CUENTA PERMANENTEMENTE ─────────────────────────────────────────
// DELETE /api/admin/users/:id
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const uid = new mongoose.Types.ObjectId(id);

    // Eliminar en cascada
    await Promise.all([
      Match.deleteMany({ usuarios: uid }),
      Mensaje.deleteMany({ $or: [{ sender_id: uid }, { receiver_id: uid }] }),
      Reporte.deleteMany({ $or: [{ reportadoPor: uid }, { reportado: uid }] }),
      Usuario.findByIdAndDelete(id),
    ]);

    res.json({ message: 'Usuario eliminado permanentemente' });
  } catch (err) {
    console.error('eliminarUsuario:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── OBTENER REPORTES (paginado + filtros) ───────────────────────────────────
// GET /api/admin/reports?estado=&page=1&limit=20
const obtenerReportes = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const estado = req.query.estado || '';

    const filtro = {};
    if (estado) filtro.estado = estado;

    const [reportes, total] = await Promise.all([
      Reporte.find(filtro)
        .populate('reportadoPor', 'first_name username correo profile_picture')
        .populate('reportado',   'first_name username correo profile_picture activo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reporte.countDocuments(filtro),
    ]);

    res.json({
      reportes,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('obtenerReportes:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── ACTUALIZAR ESTADO DE REPORTE ────────────────────────────────────────────
// PUT /api/admin/reports/:id/status
// Body: { estado: 'revisado' | 'resuelto' }
const actualizarReporte = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['pendiente', 'revisado', 'resuelto'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const reporte = await Reporte.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    )
      .populate('reportadoPor', 'first_name username correo')
      .populate('reportado',   'first_name username correo');

    if (!reporte) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    res.json({ message: 'Estado del reporte actualizado', reporte });
  } catch (err) {
    console.error('actualizarReporte:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── BANEAR USUARIO DESDE REPORTE ────────────────────────────────────────────
// POST /api/admin/reports/:id/ban
const banearDesdeReporte = async (req, res) => {
  try {
    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    await Promise.all([
      Usuario.findByIdAndUpdate(reporte.reportado, { activo: false }),
      Reporte.findByIdAndUpdate(reporte._id, { estado: 'resuelto' }),
    ]);

    res.json({ message: 'Usuario baneado y reporte resuelto correctamente' });
  } catch (err) {
    console.error('banearDesdeReporte:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── OBTENER ASOCIADOS ────────────────────────────────────────────────────────
// GET /api/admin/asociados?page=1&limit=20
const obtenerAsociados = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [asociados, total] = await Promise.all([
      Usuario.find({ rol: 'asociado' })
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Usuario.countDocuments({ rol: 'asociado' }),
    ]);

    // Añadir estadísticas de citas por asociado
    const asociadosConStats = await Promise.all(
      asociados.map(async (a) => {
        const [citasPendientes, citasAceptadas] = await Promise.all([
          Match.countDocuments({ 'recomendacion.asociadoId': a._id, 'recomendacion.estado': 'pendiente' }),
          Match.countDocuments({ 'recomendacion.asociadoId': a._id, 'recomendacion.estado': 'aceptada' }),
        ]);
        return { ...a, citasPendientes, citasAceptadas, online: isOnline(a._id) };
      })
    );

    res.json({ asociados: asociadosConStats, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('obtenerAsociados:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── OBTENER USUARIOS ONLINE ACTUALMENTE ─────────────────────────────────────
// GET /api/admin/online
const obtenerOnline = async (req, res) => {
  try {
    let onlineIds = [];
    try {
      const socketModule = require('../socket');
      if (socketModule.onlineUsers) {
        onlineIds = Array.from(socketModule.onlineUsers.keys());
      }
    } catch { /* socket no inicializado */ }

    res.json({ count: onlineIds.length, userIds: onlineIds });
  } catch (err) {
    console.error('obtenerOnline:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  loginAdmin,
  obtenerStats,
  obtenerCrecimiento,
  obtenerUsuarios,
  obtenerUsuario,
  cambiarRol,
  toggleUsuario,
  eliminarUsuario,
  obtenerReportes,
  actualizarReporte,
  banearDesdeReporte,
  obtenerAsociados,
  obtenerOnline,
};
