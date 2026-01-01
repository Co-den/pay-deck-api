const jwt = require('jsonwebtoken');
const Merchant = require('../models/Merchant.model');
const ApiKey = require('../models/ApiKey.model');

// Protect routes - JWT authentication
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get merchant from token
    req.merchant = await Merchant.findById(decoded.id).select('-password');
    
    if (!req.merchant) {
      return res.status(401).json({
        status: 'error',
        message: 'Merchant not found'
      });
    }

    if (req.merchant.accountStatus !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Account is not active'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this route'
    });
  }
};

// API Key authentication
exports.apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key is required'
    });
  }

  try {
    const apiKeyDoc = await ApiKey.verifyKey(apiKey);
    
    if (!apiKeyDoc) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired API key'
      });
    }

    // Check IP whitelist
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!apiKeyDoc.isIpAllowed(clientIp)) {
      return res.status(403).json({
        status: 'error',
        message: 'IP address not whitelisted'
      });
    }

    // Get merchant
    const merchant = await Merchant.findById(apiKeyDoc.merchant);
    if (!merchant || merchant.accountStatus !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Merchant account is not active'
      });
    }

    req.merchant = merchant;
    req.apiKey = apiKeyDoc;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'API key authentication failed'
    });
  }
};

// Check specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(403).json({
        status: 'error',
        message: 'Permission check requires API key authentication'
      });
    }

    if (!req.apiKey.hasPermission(permission)) {
      return res.status(403).json({
        status: 'error',
        message: `API key does not have '${permission}' permission`
      });
    }

    next();
  };
};

// Check account tier
exports.checkTier = (requiredTier) => {
  const tierHierarchy = { starter: 1, business: 2, enterprise: 3 };
  
  return (req, res, next) => {
    const merchantTier = tierHierarchy[req.merchant.tier];
    const required = tierHierarchy[requiredTier];

    if (merchantTier < required) {
      return res.status(403).json({
        status: 'error',
        message: `This feature requires ${requiredTier} tier or higher`
      });
    }

    next();
  };
};
