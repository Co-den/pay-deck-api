const mongoose = require("mongoose");

const PaymentMethodSchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, "Please add a payment method name"],
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "card",
      "bank_transfer",
      "ussd",
      "mobile_money",
      "crypto",
      "qr_code",
    ],
    index: true,
  },
  provider: {
    type: String,
    required: [true, "Please add a provider"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  enabled: {
    type: Boolean,
    default: false,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  setupComplete: {
    type: Boolean,
    default: false,
  },

  // Provider configuration (encrypted in production)
  configuration: {
    publicKey: String,
    secretKey: {
      type: String,
      select: false, // Don't return in queries by default
    },
    apiKey: {
      type: String,
      select: false,
    },
    merchantId: String,
    encryptionKey: {
      type: String,
      select: false,
    },
    webhookUrl: String,
    testMode: {
      type: Boolean,
      default: true,
    },
    // Additional provider-specific settings
    settings: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },

  // Fee structure
  fees: {
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    fixedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cap: {
      type: Number,
      min: 0,
    },
  },

  // Transaction limits
  limits: {
    min: {
      type: Number,
      required: true,
      default: 100,
    },
    max: {
      type: Number,
      required: true,
      default: 10000000,
    },
  },

  // Supported currencies and countries
  supportedCurrencies: [
    {
      type: String,
      uppercase: true,
    },
  ],
  supportedCountries: [
    {
      type: String,
      uppercase: true,
    },
  ],

  // Settlement information
  settlementPeriod: {
    type: String,
    default: "T+1", // T+0, T+1, T+2, etc.
  },

  // Features supported by this method
  features: [
    {
      type: String,
    },
  ],

  // Display order in UI
  displayOrder: {
    type: Number,
    default: 0,
  },

  // Statistics (updated periodically)
  stats: {
    totalTransactions: {
      type: Number,
      default: 0,
    },
    successfulTransactions: {
      type: Number,
      default: 0,
    },
    failedTransactions: {
      type: Number,
      default: 0,
    },
    totalVolume: {
      type: Number,
      default: 0,
    },
    lastTransactionDate: Date,
    successRate: {
      type: Number,
      default: 0,
    },
  },

  // Metadata
  metadata: {
    type: Map,
    of: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
PaymentMethodSchema.index({ merchant: 1, enabled: 1 });
PaymentMethodSchema.index({ merchant: 1, type: 1 });
PaymentMethodSchema.index({ merchant: 1, provider: 1 });
PaymentMethodSchema.index({ displayOrder: 1 });

// Update timestamp
PaymentMethodSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate success rate when stats are updated
PaymentMethodSchema.pre("save", function (next) {
  if (this.stats.totalTransactions > 0) {
    this.stats.successRate =
      (this.stats.successfulTransactions / this.stats.totalTransactions) * 100;
  }
  next();
});

// Method to check if payment method can process amount
PaymentMethodSchema.methods.canProcessAmount = function (amount) {
  return amount >= this.limits.min && amount <= this.limits.max;
};

// Method to calculate fee for an amount
PaymentMethodSchema.methods.calculateFee = function (amount) {
  let fee = (amount * this.fees.percentage) / 100;

  if (this.fees.fixedAmount) {
    fee += this.fees.fixedAmount;
  }

  if (this.fees.cap && fee > this.fees.cap) {
    fee = this.fees.cap;
  }

  return Math.round(fee * 100) / 100; // Round to 2 decimal places
};

// Method to check if currency is supported
PaymentMethodSchema.methods.supportsCurrency = function (currency) {
  return this.supportedCurrencies.includes(currency.toUpperCase());
};

// Method to check if country is supported
PaymentMethodSchema.methods.supportsCountry = function (country) {
  return this.supportedCountries.includes(country.toUpperCase());
};

// Virtual for configuration without secrets
PaymentMethodSchema.virtual("publicConfiguration").get(function () {
  return {
    publicKey: this.configuration.publicKey,
    merchantId: this.configuration.merchantId,
    webhookUrl: this.configuration.webhookUrl,
    testMode: this.configuration.testMode,
    settings: this.configuration.settings,
  };
});

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema);
