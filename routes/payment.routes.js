const express = require('express');
const router = express.Router();
const {
  createPayment,
  createPaymentLink,
  getPayment,
  refundPayment,
  cancelPayment
} = require('../controllers/payment.controller');
const { apiKeyAuth, checkPermission } = require('../middleware/auth');

// All payment routes require API key authentication
router.use(apiKeyAuth);

// Create payment/charge
router.post('/charge', checkPermission('write'), createPayment);

// Create payment link
router.post('/links', checkPermission('write'), createPaymentLink);

// Get payment by transaction ID
router.get('/:transactionId', checkPermission('read'), getPayment);

// Refund payment
router.post('/:transactionId/refund', checkPermission('refund'), refundPayment);

// Cancel payment
router.post('/:transactionId/cancel', checkPermission('write'), cancelPayment);

module.exports = router;
