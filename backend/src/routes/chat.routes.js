const router = require('express').Router();
const { obtenerMensajes, enviarMensaje } = require('../controllers/chat.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/:userId',  obtenerMensajes);  // GET  /api/chat/:userId
router.post('/:userId', enviarMensaje);    // POST /api/chat/:userId

module.exports = router;
