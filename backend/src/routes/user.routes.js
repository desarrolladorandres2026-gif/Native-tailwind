const router = require('express').Router();
const {
  register,
  discover,
  obtenerPerfil,
  obtenerStats,
  actualizarPerfil,
  subirAvatar,
  eliminarAvatar,
  subirCoverPhoto,
  eliminarCoverPhoto,
  agregarFotos,
  eliminarFoto,
  eliminarCuenta,
} = require('../controllers/user.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { uploadSingle, uploadMultiple } = require('../middlewares/upload.middleware');

// ── Públicas ──────────────────────────────────────────────────────────────────
router.post('/register', register);                             // POST /api/users/register

// ── Protegidas ────────────────────────────────────────────────────────────────
router.get('/discover', verificarToken, discover);            // GET  /api/users/discover
router.get('/me/stats', verificarToken, obtenerStats);        // GET  /api/users/me/stats
router.put('/profile', verificarToken, actualizarPerfil);   // PUT  /api/users/profile (texto/ubicación)
router.post('/profile/avatar', verificarToken, uploadSingle, subirAvatar);       // POST /api/users/profile/avatar
router.delete('/profile/avatar', verificarToken, eliminarAvatar);                // DELETE /api/users/profile/avatar
router.post('/profile/cover', verificarToken, uploadSingle, subirCoverPhoto);   // POST /api/users/profile/cover
router.delete('/profile/cover', verificarToken, eliminarCoverPhoto);             // DELETE /api/users/profile/cover
router.post('/profile/photos', verificarToken, uploadMultiple, agregarFotos);     // POST /api/users/profile/photos
router.delete('/profile/photos/:encodedId', verificarToken, eliminarFoto);               // DELETE /api/users/profile/photos/:id
router.delete('/me', verificarToken, eliminarCuenta);     // DELETE /api/users/me (eliminación permanente)
router.get('/:id', verificarToken, obtenerPerfil);      // GET  /api/users/:id  ← al final

module.exports = router;
