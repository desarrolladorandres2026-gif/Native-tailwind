// ── report.routes.js ─────────────────────────────────────────────────────────
// Agregar en app.js: app.use('/api/report', require('./routes/report.routes'));
const router = require('express').Router();
const { reportarUsuario, misReportes } = require('../controllers/report.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);
router.post('/:userId',      reportarUsuario);  // POST /api/report/:userId
router.get('/mis-reportes',  misReportes);      // GET  /api/report/mis-reportes

module.exports = router;