const express = require('express');
const router = express.Router();
const {
  obtenerRestaurante,
  actualizarRestaurante,
  subirFotos,
  eliminarFoto,
  actualizarMenu,
  agregarPlato,
  eliminarPlato,
  obtenerCitas,
  obtenerEstadisticas,
} = require('../controllers/asociado.controller');
const { verificarToken, soloAsociado } = require('../middlewares/auth.middleware');

// Todas las rutas requieren token + rol asociado
router.use(verificarToken, soloAsociado);

// ── Restaurante ────────────────────────────────────────────────────────
router.get('/restaurante', obtenerRestaurante);
router.put('/restaurante', actualizarRestaurante);

// ── Fotos ──────────────────────────────────────────────────────────────
router.post('/restaurante/fotos', subirFotos);
router.delete('/restaurante/fotos/:publicId', eliminarFoto);

// ── Menú ───────────────────────────────────────────────────────────────
router.put('/restaurante/menu', actualizarMenu);
router.post('/restaurante/menu/plato', agregarPlato);
router.delete('/restaurante/menu/:platoId', eliminarPlato);

// ── Citas ──────────────────────────────────────────────────────────────
router.get('/citas', obtenerCitas);

// ── Estadísticas ───────────────────────────────────────────────────────
router.get('/estadisticas', obtenerEstadisticas);

module.exports = router;
