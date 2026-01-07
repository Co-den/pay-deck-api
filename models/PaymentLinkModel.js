const mongoose = require("mongoose");

const PaymentLinkSchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, "Please add a title"],
    trim: true,
    maxlength: [200, "Title cannot be more than 200 characters"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot be more than 1000 characters"],
  },
  amount: {
    type: Number,
    required: [true, "Please add an amount"],
    min: [0, "Amount must be greater than 0"],
  },
  currency: {
    type: String,
    required: [true, "Please add a currency"],
    uppercase: true,
    default: "NGN",
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["active", "expired", "disabled"],
    default: "active",
    index: true,
  },

  // Limits
  expiresAt: {
    type: Date,
    default: null,
  },
  maxUses: {
    type: Number,
    default: null,
    min: 0,
  },
  currentUses: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Statistics
  stats: {
    totalRevenue: {
      type: Number,
      default: 0,
    },
    successfulPayments: {
      type: Number,
      default: 0,
    },
    failedPayments: {
      type: Number,
      default: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
  },

  // Settings
  settings: {
    collectShipping: {
      type: Boolean,
      default: false,
    },
    collectPhone: {
      type: Boolean,
      default: false,
    },
    allowQuantity: {
      type: Boolean,
      default: false,
    },
    redirectUrl: {
      type: String,
      trim: true,
    },
    successMessage: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
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
PaymentLinkSchema.index({ merchant: 1, status: 1 });
PaymentLinkSchema.index({ merchant: 1, createdAt: -1 });
PaymentLinkSchema.index({ shortCode: 1 }, { unique: true });
PaymentLinkSchema.index({ expiresAt: 1 });

// Update timestamp
PaymentLinkSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate conversion rate before save
PaymentLinkSchema.pre("save", function (next) {
  if (this.stats.totalViews > 0) {
    this.stats.conversionRate =
      (this.stats.successfulPayments / this.stats.totalViews) * 100;
  }
  next();
});

// Check if expired before save
PaymentLinkSchema.pre("save", function (next) {
  if (
    this.expiresAt &&
    new Date(this.expiresAt) < new Date() &&
    this.status === "active"
  ) {
    this.status = "expired";
  }

  // Check max uses
  if (
    this.maxUses &&
    this.currentUses >= this.maxUses &&
    this.status === "active"
  ) {
    this.status = "expired";
  }

  next();
});

// Method to increment uses
PaymentLinkSchema.methods.incrementUses = async function () {
  this.currentUses += 1;
  return this.save();
};

// Method to record payment
PaymentLinkSchema.methods.recordPayment = async function (
  amount,
  success = true
) {
  if (success) {
    this.stats.successfulPayments += 1;
    this.stats.totalRevenue += amount;
  } else {
    this.stats.failedPayments += 1;
  }

  this.currentUses += 1;

  // Check if should expire due to max uses
  if (this.maxUses && this.currentUses >= this.maxUses) {
    this.status = "expired";
  }

  return this.save();
};

// Method to check if link is valid
PaymentLinkSchema.methods.isValid = function () {
  if (this.status !== "active") {
    return { valid: false, reason: "Payment link is not active" };
  }

  if (this.expiresAt && new Date(this.expiresAt) < new Date()) {
    return { valid: false, reason: "Payment link has expired" };
  }

  if (this.maxUses && this.currentUses >= this.maxUses) {
    return { valid: false, reason: "Payment link has reached maximum uses" };
  }

  return { valid: true };
};

// Virtual for average order value
PaymentLinkSchema.virtual("averageOrderValue").get(function () {
  if (this.stats.successfulPayments === 0) return 0;
  return this.stats.totalRevenue / this.stats.successfulPayments;
});

// Virtual for days until expiration
PaymentLinkSchema.virtual("daysUntilExpiration").get(function () {
  if (!this.expiresAt) return null;
  const now = new Date();
  const expires = new Date(this.expiresAt);
  const diffTime = expires - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Virtual for remaining uses
PaymentLinkSchema.virtual("remainingUses").get(function () {
  if (!this.maxUses) return null;
  return Math.max(0, this.maxUses - this.currentUses);
});

module.exports = mongoose.model("PaymentLink", PaymentLinkSchema);
