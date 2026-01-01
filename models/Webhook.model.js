const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: [true, 'Webhook URL is required'],
    trim: true,
    match: [/^https?:\/\/.+/, 'Please provide a valid URL']
  },
  events: [{
    type: String,
    enum: [
      'payment.created',
      'payment.success',
      'payment.failed',
      'payment.cancelled',
      'refund.created',
      'refund.processed',
      'settlement.completed'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  secret: {
    type: String,
    required: true
  },
  retryPolicy: {
    maxAttempts: { type: Number, default: 3 },
    retryDelaySeconds: { type: Number, default: 60 }
  },
  statistics: {
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    lastDeliveryAt: Date,
    lastDeliveryStatus: String
  }
}, {
  timestamps: true
});

// Webhook delivery log subdocument schema
const webhookLogSchema = new mongoose.Schema({
  webhook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook',
    required: true,
    index: true
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  event: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  attempts: [{
    attemptNumber: Number,
    timestamp: Date,
    statusCode: Number,
    responseTime: Number,
    success: Boolean,
    errorMessage: String
  }],
  finalStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  totalAttempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

webhookLogSchema.index({ webhook: 1, createdAt: -1 });
webhookLogSchema.index({ transaction: 1 });

const Webhook = mongoose.model('Webhook', webhookSchema);
const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);

module.exports = { Webhook, WebhookLog };
