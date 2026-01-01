const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyPrefix: {
    type: String,
    required: true
  },
  hashedKey: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['test', 'live'],
    required: true,
    default: 'test'
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'refund', 'webhook'],
    default: ['read', 'write']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: Date,
  usageCount: {
    type: Number,
    default: 0
  },
  expiresAt: Date,
  ipWhitelist: [String],
  rateLimit: {
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 10000 }
  }
}, {
  timestamps: true
});

// Generate API key
apiKeySchema.statics.generateKey = function(type = 'test') {
  const prefix = type === 'live' ? 'pk_live_' : 'pk_test_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = prefix + randomBytes;
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
  
  return {
    key,
    keyPrefix: prefix + randomBytes.substring(0, 8),
    hashedKey
  };
};

// Verify API key
apiKeySchema.statics.verifyKey = async function(providedKey) {
  const hashedKey = crypto.createHash('sha256').update(providedKey).digest('hex');
  const apiKey = await this.findOne({ hashedKey, isActive: true });
  
  if (!apiKey) {
    return null;
  }
  
  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }
  
  // Update usage stats
  apiKey.lastUsed = new Date();
  apiKey.usageCount += 1;
  await apiKey.save();
  
  return apiKey;
};

// Method to check permissions
apiKeySchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Method to check IP whitelist
apiKeySchema.methods.isIpAllowed = function(ip) {
  if (!this.ipWhitelist || this.ipWhitelist.length === 0) {
    return true;
  }
  return this.ipWhitelist.includes(ip);
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
