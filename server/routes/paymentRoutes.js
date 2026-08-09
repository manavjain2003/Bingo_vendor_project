const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

router.use(authenticate);

router.post('/webhook', requirePermission('payment.webhook'), paymentController.webhook);
router.get('/:id', paymentController.getPayment);

module.exports = router;
