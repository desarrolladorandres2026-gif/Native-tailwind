const router = require('express').Router();
const { login, me } = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/login', login);       // POST /api/login
router.get('/me',    verificarToken, me);  // GET  /api/me

module.exports = router;
