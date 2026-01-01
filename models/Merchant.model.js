const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const merchantSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  businessType: {
    type: String,
    enum: ['retail', 'ecommerce', 'saas', 'marketplace', 'other', "individual"],
    default: 'other'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  website: {
    type: String,
    trim: true
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'closed'],
    default: 'active'
  },
  tier: {
    type: String,
    enum: ['starter', 'business', 'enterprise'],
    default: 'starter'
  },
  verificationStatus: {
    isEmailVerified: { type: Boolean, default: false },
    isBusinessVerified: { type: Boolean, default: false },
    isBankVerified: { type: Boolean, default: false }
  },
  bankAccount: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    routingNumber: String
  },
  settings: {
    webhookUrl: String,
    notificationEmail: String,
    currency: { type: String, default: 'USD' },
    autoSettle: { type: Boolean, default: true },
    settlementSchedule: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' }
  },
  statistics: {
    totalTransactions: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    successfulTransactions: { type: Number, default: 0 },
    failedTransactions: { type: Number, default: 0 },
    totalRefunds: { type: Number, default: 0 }
  },
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: String
  },
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Encrypt password before saving
merchantSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
merchantSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
merchantSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Update statistics
merchantSchema.methods.updateStats = async function(transaction) {
  this.statistics.totalTransactions += 1;
  if (transaction.status === 'success') {
    this.statistics.successfulTransactions += 1;
    this.statistics.totalRevenue += transaction.amount;
  } else if (transaction.status === 'failed') {
    this.statistics.failedTransactions += 1;
  }
  await this.save();
};

module.exports = mongoose.model('Merchant', merchantSchema);
