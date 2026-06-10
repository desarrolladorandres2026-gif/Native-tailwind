const router = require('express').Router();
const { darLike, darSuperLike, darDislike, listarMatches, aceptarCita, rechazarCita, sugerirNuevoLugar } = require('../controllers/match.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/',                       listarMatches);       // GET  /api/matches
router.post('/like/:targetId',        darLike);             // POST /api/matches/like/:id
router.post('/superlike/:targetId',   darSuperLike);        // POST /api/matches/superlike/:id
router.post('/dislike/:targetId',     darDislike);          // POST /api/matches/dislike/:id
router.post('/:id/accept-date',       aceptarCita);         // POST /api/matches/:id/accept-date
router.post('/:id/reject-date',       rechazarCita);        // POST /api/matches/:id/reject-date
router.post('/:id/suggest-new-place', sugerirNuevoLugar);   // POST /api/matches/:id/suggest-new-place

module.exports = router;
