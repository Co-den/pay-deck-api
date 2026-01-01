const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransaction,
  getAnalytics,
  exportTransactions
} = require('../controllers/transaction.controller');
const { protect } = require('../middleware/auth');

// All transaction routes require JWT authentication
router.use(protect);

// Get all transactions with filters
router.get('/', getTransactions);

// Get analytics/summary
router.get('/analytics/summary', getAnalytics);

// Export transactions
router.get('/export', exportTransactions);

// Get single transaction
router.get('/:id', getTransaction);

module.exports = router;
