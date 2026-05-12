const router = require('express').Router();
const { obtenerSettings, actualizarSettings, cambiarPassword } = require('../controllers/settings.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/',           obtenerSettings);    // GET  /api/settings
router.put('/',           actualizarSettings); // PUT  /api/settings
router.put('/password',   cambiarPassword);    // PUT  /api/settings/password

module.exports = router;
