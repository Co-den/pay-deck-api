const { Webhook, WebhookLog } = require('../models/Webhook.model');
const crypto = require('crypto');

// @desc    Create webhook
// @route   POST /api/webhooks
// @access  Private
exports.createWebhook = async (req, res, next) => {
  try {
    const { url, events } = req.body;

    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'Webhook URL is required'
      });
    }

    if (!events || events.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one event is required'
      });
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await Webhook.create({
      merchant: req.merchant._id,
      url,
      events,
      secret
    });

    res.status(201).json({
      status: 'success',
      message: 'Webhook created successfully',
      data: {
        webhook,
        secret // Return secret only on creation
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all webhooks
// @route   GET /api/webhooks
// @access  Private
exports.getWebhooks = async (req, res, next) => {
  try {
    const webhooks = await Webhook.find({ merchant: req.merchant._id })
      .select('-secret')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      data: { webhooks }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single webhook
// @route   GET /api/webhooks/:id
// @access  Private
exports.getWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    }).select('-secret');

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { webhook }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update webhook
// @route   PUT /api/webhooks/:id
// @access  Private
exports.updateWebhook = async (req, res, next) => {
  try {
    const { url, events, isActive } = req.body;

    const webhook = await Webhook.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    if (url) webhook.url = url;
    if (events) webhook.events = events;
    if (typeof isActive !== 'undefined') webhook.isActive = isActive;

    await webhook.save();

    res.status(200).json({
      status: 'success',
      message: 'Webhook updated successfully',
      data: { webhook }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete webhook
// @route   DELETE /api/webhooks/:id
// @access  Private
exports.deleteWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    await webhook.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Webhook deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test webhook
// @route   POST /api/webhooks/:id/test
// @access  Private
exports.testWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from PayDeck'
      }
    };

    // Send test webhook
    const axios = require('axios');
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');

    try {
      const response = await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-PayDeck-Signature': signature
        },
        timeout: 5000
      });

      res.status(200).json({
        status: 'success',
        message: 'Test webhook sent successfully',
        data: {
          statusCode: response.status,
          responseTime: response.headers['x-response-time']
        }
      });
    } catch (error) {
      res.status(200).json({
        status: 'warning',
        message: 'Test webhook failed',
        data: {
          error: error.message,
          statusCode: error.response?.status
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get webhook logs
// @route   GET /api/webhooks/:id/logs
// @access  Private
exports.getWebhookLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const webhook = await Webhook.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!webhook) {
      return res.status(404).json({
        status: 'error',
        message: 'Webhook not found'
      });
    }

    const skip = (page - 1) * limit;
    const logs = await WebhookLog.find({ webhook: webhook._id })
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .populate('transaction', 'transactionId amount status');

    const total = await WebhookLog.countDocuments({ webhook: webhook._id });

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
