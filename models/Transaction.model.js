const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true
  },
  customer: {
    email: { type: String, required: true },
    name: String,
    phone: String,
    ipAddress: String,
    userAgent: String
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet', 'crypto'],
      required: true
    },
    provider: String,
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  description: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: String
  },
  fees: {
    platformFee: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 }
  },
  refund: {
    isRefunded: { type: Boolean, default: false },
    refundedAmount: { type: Number, default: 0 },
    refundDate: Date,
    refundReason: String,
    refundTransactionId: String
  },
  settlement: {
    isSettled: { type: Boolean, default: false },
    settlementDate: Date,
    settlementBatchId: String
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  failureReason: {
    code: String,
    message: String
  },
  webhookSent: {
    type: Boolean,
    default: false
  },
  webhookAttempts: {
    type: Number,
    default: 0
  },
  externalReference: String,
  providerTransactionId: String,
  processedAt: Date,
  settledAt: Date
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ merchant: 1, createdAt: -1 });
transactionSchema.index({ 'customer.email': 1 });
transactionSchema.index({ status: 1, createdAt: -1 });

// Calculate fees before saving
transactionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Calculate fees (2.9% + $0.30 typical payment processor fee)
    this.fees.processingFee = (this.amount * 0.029) + 0.30;
    this.fees.platformFee = this.amount * 0.005; // 0.5% platform fee
    this.fees.totalFee = this.fees.processingFee + this.fees.platformFee;
  }
  next();
});

// Method to process refund
transactionSchema.methods.processRefund = async function(amount, reason) {
  if (this.status !== 'success') {
    throw new Error('Can only refund successful transactions');
  }
  
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed transaction amount');
  }
  
  this.refund.isRefunded = true;
  this.refund.refundedAmount = amount;
  this.refund.refundDate = new Date();
  this.refund.refundReason = reason;
  
  if (amount === this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }
  
  await this.save();
  return this;
};

module.exports = mongoose.model('Transaction', transactionSchema);
