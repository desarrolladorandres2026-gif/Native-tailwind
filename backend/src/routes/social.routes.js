const router = require('express').Router();
const {
  loginGoogle,
  loginFacebook,
  sincronizarAmigos,
  conexionesEnComun,
} = require('../controllers/social.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Autenticación social (sin token)
router.post('/google',   loginGoogle);    // POST /api/auth/google
router.post('/facebook', loginFacebook);  // POST /api/auth/facebook

// Requieren token JWT ya generado
router.post('/social/friends',                    verificarToken, sincronizarAmigos);   // POST /api/auth/social/friends
router.get('/common-connections/:userId',          verificarToken, conexionesEnComun);  // GET  /api/auth/common-connections/:id

module.exports = router;
