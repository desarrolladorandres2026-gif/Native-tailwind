// ── likes.routes.js ──────────────────────────────────────────────────────────
// Agregar en app.js: app.use('/api/likes', require('./routes/likes.routes'));
const router = require('express').Router();
const { likesRecibidos } = require('../controllers/likes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);
router.get('/', likesRecibidos);   // GET /api/likes  → quién me dio like

module.exports = router;