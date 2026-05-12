const router = require('express').Router();
const {
  crearTicket,
  misTickets,
} = require('../controllers/soporte.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.post('/',            crearTicket);   // POST /api/soporte
router.get('/mis-tickets',  misTickets);    // GET  /api/soporte/mis-tickets

module.exports = router;
