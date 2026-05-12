const express = require('express');
const router = express.Router();
const { obtenerCitas } = require('../controllers/asociado.controller');
const { verificarToken, soloAsociado } = require('../middlewares/auth.middleware');

router.use(verificarToken, soloAsociado);

router.get('/citas', obtenerCitas);

module.exports = router;
