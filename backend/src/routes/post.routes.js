const router = require('express').Router();
const {
  crearPost, misPosts, postsPorUsuario,
  toggleLikePost, eliminarPost,
} = require('../controllers/post.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { uploadSingle }   = require('../middlewares/upload.middleware');

router.post('/',              verificarToken, uploadSingle, crearPost);       // POST   /api/posts
router.get('/me',             verificarToken, misPosts);                      // GET    /api/posts/me
router.get('/user/:id',       verificarToken, postsPorUsuario);               // GET    /api/posts/user/:id
router.post('/:id/like',      verificarToken, toggleLikePost);               // POST   /api/posts/:id/like
router.delete('/:id',         verificarToken, eliminarPost);                  // DELETE /api/posts/:id

module.exports = router;
