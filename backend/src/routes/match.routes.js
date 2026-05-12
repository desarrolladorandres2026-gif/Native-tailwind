const router = require('express').Router();
const { darLike, darDislike, listarMatches, aceptarCita } = require('../controllers/match.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/',                   listarMatches);   // GET  /api/matches
router.post('/like/:targetId',    darLike);         // POST /api/matches/like/:id
router.post('/dislike/:targetId', darDislike);      // POST /api/matches/dislike/:id
router.post('/:id/accept-date',   aceptarCita);     // POST /api/matches/:id/accept-date

module.exports = router;
