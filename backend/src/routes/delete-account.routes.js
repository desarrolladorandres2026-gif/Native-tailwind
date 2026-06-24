const router = require('express').Router();
const { requestDeletion, confirmDeletion } = require('../controllers/delete-account.controller');

router.post('/request', requestDeletion);   // POST /api/delete-account/request
router.post('/confirm', confirmDeletion);   // POST /api/delete-account/confirm

module.exports = router;
