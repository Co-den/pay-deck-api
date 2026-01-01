const express = require('express');
const router = express.Router();
const {
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookLogs
} = require('../controllers/webhook.controller');
const { protect } = require('../middleware/auth');

// All webhook routes require JWT authentication
router.use(protect);

router.route('/')
  .get(getWebhooks)
  .post(createWebhook);

router.route('/:id')
  .get(getWebhook)
  .put(updateWebhook)
  .delete(deleteWebhook);

router.post('/:id/test', testWebhook);
router.get('/:id/logs', getWebhookLogs);

module.exports = router;
