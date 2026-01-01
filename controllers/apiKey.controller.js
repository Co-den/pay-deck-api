const ApiKey = require('../models/ApiKey.model');

// @desc    Create new API key
// @route   POST /api/keys
// @access  Private
exports.createApiKey = async (req, res, next) => {
  try {
    const { name, type = 'test', permissions, expiresIn } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'API key name is required'
      });
    }

    // Generate key
    const { key, keyPrefix, hashedKey } = ApiKey.generateKey(type);

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
    }

    // Create API key
    const apiKey = await ApiKey.create({
      merchant: req.merchant._id,
      name,
      key,
      keyPrefix,
      hashedKey,
      type,
      permissions: permissions || ['read', 'write'],
      expiresAt
    });

    // Return the full key only once (it's not stored)
    res.status(201).json({
      status: 'success',
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
      data: {
        key, // Full key shown only once
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          type: apiKey.type,
          permissions: apiKey.permissions,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all API keys for merchant
// @route   GET /api/keys
// @access  Private
exports.getApiKeys = async (req, res, next) => {
  try {
    const apiKeys = await ApiKey.find({ merchant: req.merchant._id })
      .select('-hashedKey -key')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      data: { apiKeys }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single API key
// @route   GET /api/keys/:id
// @access  Private
exports.getApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    }).select('-hashedKey -key');

    if (!apiKey) {
      return res.status(404).json({
        status: 'error',
        message: 'API key not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { apiKey }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update API key
// @route   PUT /api/keys/:id
// @access  Private
exports.updateApiKey = async (req, res, next) => {
  try {
    const { name, permissions, isActive, ipWhitelist } = req.body;

    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!apiKey) {
      return res.status(404).json({
        status: 'error',
        message: 'API key not found'
      });
    }

    // Update fields
    if (name) apiKey.name = name;
    if (permissions) apiKey.permissions = permissions;
    if (typeof isActive !== 'undefined') apiKey.isActive = isActive;
    if (ipWhitelist) apiKey.ipWhitelist = ipWhitelist;

    await apiKey.save();

    res.status(200).json({
      status: 'success',
      message: 'API key updated successfully',
      data: { apiKey }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete API key
// @route   DELETE /api/keys/:id
// @access  Private
exports.deleteApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!apiKey) {
      return res.status(404).json({
        status: 'error',
        message: 'API key not found'
      });
    }

    await apiKey.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'API key deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rotate API key
// @route   POST /api/keys/:id/rotate
// @access  Private
exports.rotateApiKey = async (req, res, next) => {
  try {
    const oldKey = await ApiKey.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!oldKey) {
      return res.status(404).json({
        status: 'error',
        message: 'API key not found'
      });
    }

    // Generate new key
    const { key, keyPrefix, hashedKey } = ApiKey.generateKey(oldKey.type);

    // Update key
    oldKey.key = key;
    oldKey.keyPrefix = keyPrefix;
    oldKey.hashedKey = hashedKey;
    oldKey.usageCount = 0;
    await oldKey.save();

    res.status(200).json({
      status: 'success',
      message: 'API key rotated successfully. Save this key securely - it will not be shown again.',
      data: {
        key, // Full new key shown only once
        apiKey: {
          id: oldKey._id,
          name: oldKey.name,
          keyPrefix: oldKey.keyPrefix,
          type: oldKey.type
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
