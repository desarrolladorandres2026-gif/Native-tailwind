const router = require('express').Router();
const { registrarToken, eliminarToken } = require('../controllers/notification.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// ── Protegidas ────────────────────────────────────────────────────────────────
router.post('/token', verificarToken, registrarToken);     // POST   /api/notifications/token
router.delete('/token', verificarToken, eliminarToken);    // DELETE /api/notifications/token

module.exports = router;
