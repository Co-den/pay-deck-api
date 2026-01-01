const express = require('express');
const router = express.Router();
const {
  createApiKey,
  getApiKeys,
  getApiKey,
  updateApiKey,
  deleteApiKey,
  rotateApiKey
} = require('../controllers/apiKey.controller');
const { protect } = require('../middleware/auth');

// All API key routes require JWT authentication
router.use(protect);

router.route('/')
  .get(getApiKeys)
  .post(createApiKey);

router.route('/:id')
  .get(getApiKey)
  .put(updateApiKey)
  .delete(deleteApiKey);

router.post('/:id/rotate', rotateApiKey);

module.exports = router;
