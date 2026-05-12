/**
 * facial.routes.js
 * Agregar en app.js: app.use('/api/facial', require('./routes/facial.routes'));
 */
const router = require('express').Router();
const {
  verificarRostro,
  guardarFotoFacial,
  verificarRostroLogin,
} = require('../controllers/facial.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// ── Públicas (no requieren token) ─────────────────────────────────────────────

// Verifica que una imagen tiene un rostro válido
// Usado en: RegisterScreen paso 2 (antes de crear cuenta)
router.post('/verify', verificarRostro);

// Guarda la foto facial. Acepta userId en body (registro)
// o token en header (desde perfil ya logueado)
router.post('/register', guardarFotoFacial);

// Compara el rostro enviado con el guardado del usuario (2do factor en login)
router.post('/login-verify', verificarRostroLogin);

// ── Protegida — solo con token ────────────────────────────────────────────────

// Actualizar foto facial estando logueado (desde perfil/settings)
router.put('/update', verificarToken, guardarFotoFacial);

module.exports = router;