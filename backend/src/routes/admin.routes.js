const express = require('express');
const router  = express.Router();
const {
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
} = require('../controllers/admin.controller');
const {
  adminObtenerTickets,
  adminActualizarTicket,
  adminStatsTickets,
} = require('../controllers/soporte.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

// ─── Ruta pública: login del panel ────────────────────────────────────────────
router.post('/login', loginAdmin);

// ─── Todas las demás rutas requieren token + rol admin ───────────────────────
router.use(verificarToken, soloAdmin);

// Dashboard
router.get('/stats',    obtenerStats);
router.get('/growth',   obtenerCrecimiento);
router.get('/online',   obtenerOnline);

// Usuarios
router.get('/users',             obtenerUsuarios);
router.get('/users/:id',         obtenerUsuario);
router.put('/users/:id/role',    cambiarRol);
router.put('/users/:id/toggle',  toggleUsuario);
router.delete('/users/:id',      eliminarUsuario);

// Reportes
router.get('/reports',              obtenerReportes);
router.put('/reports/:id/status',   actualizarReporte);
router.post('/reports/:id/ban',     banearDesdeReporte);

// Asociados
router.get('/asociados', obtenerAsociados);

// Soporte
router.get('/soporte/stats', adminStatsTickets);
router.get('/soporte',       adminObtenerTickets);
router.put('/soporte/:id',   adminActualizarTicket);

module.exports = router;
