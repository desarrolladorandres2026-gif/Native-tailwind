const router = require('express').Router();
const { obtenerMensajes, enviarMensaje, subirImagen } = require('../controllers/chat.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { uploadSingle }   = require('../middlewares/upload.middleware');

router.use(verificarToken);

router.post('/upload',  uploadSingle, subirImagen); // POST /api/chat/upload
router.get('/:userId',  obtenerMensajes);  // GET  /api/chat/:userId
router.post('/:userId', enviarMensaje);    // POST /api/chat/:userId

module.exports = router;
