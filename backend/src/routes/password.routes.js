/**
 * password.routes.js
 * Rutas públicas para recuperación de contraseña
 */

const router = require('express').Router();
const { forgotPassword, verifyCode, resetPassword } = require('../controllers/password.controller');

router.post('/forgot', forgotPassword);   // POST /api/password/forgot
router.post('/verify', verifyCode);       // POST /api/password/verify
router.post('/reset',  resetPassword);    // POST /api/password/reset

module.exports = router;
