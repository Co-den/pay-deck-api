const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const merchantSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    businessProfile: {
      businessType: {
        type: String,
        enum: [
          "retail",
          "ecommerce",
          "saas",
          "marketplace",
          "services",
          "nonprofit",
          "individual",
          "other",
        ],
        default: "other",
      },
      description: {
        type: String,
        trim: true,
      },
      taxId: {
        type: String,
        trim: true,
      },
      industry: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      businessEmail: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },

    accountStatus: {
      type: String,
      enum: [
        "pending",
        "active",
        "suspended",
        "deactivated",
        "deleted",
        "closed",
      ],
      default: "active",
    },

    tier: {
      type: String,
      enum: ["free", "starter", "business", "enterprise"],
      default: "starter",
    },

    verificationStatus: {
      isEmailVerified: { type: Boolean, default: false },
      isBusinessVerified: { type: Boolean, default: false },
      isBankVerified: { type: Boolean, default: false },
    },

    bankAccount: {
      bankName: {
        type: String,
        trim: true,
      },
      accountName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      routingNumber: {
        type: String,
        trim: true,
      },
      accountType: {
        type: String,
        enum: ["checking", "savings"],
        default: "checking",
      },
      payoutSchedule: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "daily",
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
    notificationPreferences: {
      email: {
        enabled: { type: Boolean, default: true },
        address: { type: String, trim: true },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        phoneNumber: { type: String, trim: true },
      },
      events: {
        paymentCompleted: { type: Boolean, default: true },
        paymentFailed: { type: Boolean, default: true },
        paymentRefunded: { type: Boolean, default: true },
        payoutCompleted: { type: Boolean, default: true },
        suspiciousActivity: { type: Boolean, default: true },
        weeklySummary: { type: Boolean, default: false },
        monthlyReport: { type: Boolean, default: false },
      },
    },

    settings: {
      webhookUrl: String,
      notificationEmail: String,
      currency: { type: String, default: "USD" },
      autoSettle: { type: Boolean, default: true },
      settlementSchedule: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "daily",
      },
    },

    statistics: {
      totalTransactions: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      successfulTransactions: { type: Number, default: 0 },
      failedTransactions: { type: Number, default: 0 },
      totalRefunds: { type: Number, default: 0 },
    },
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false,
      },
      secret: {
        type: String,
      },
      backupCodes: [
        {
          code: String,
          used: { type: Boolean, default: false },
        },
      ],
      enabledAt: {
        type: Date,
      },
    },
    loginHistory: [
      {
        ipAddress: {
          type: String,
          required: true,
        },
        location: {
          city: String,
          region: String,
          country: String,
          coordinates: {
            latitude: Number,
            longitude: Number,
          },
        },
        device: {
          browser: String,
          os: String,
          device: String,
        },
        userAgent: String,
        loginAt: {
          type: Date,
          default: Date.now,
        },
        successful: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // ============================================
    // BILLING PLAN (NEW)
    // ============================================
    billingPlan: {
      planName: {
        type: String,
        enum: ["free", "starter", "business", "enterprise"],
        default: "free",
      },
      planPrice: {
        type: Number,
        default: 0,
      },
      billingCycle: {
        type: String,
        enum: ["monthly", "yearly"],
        default: "monthly",
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      nextBillingDate: {
        type: Date,
      },
      status: {
        type: String,
        enum: ["active", "cancelled", "expired", "past_due"],
        default: "active",
      },
      features: {
        transactionLimit: { type: Number, default: 100 },
        apiAccess: { type: Boolean, default: false },
        advancedAnalytics: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false },
      },
    },

    // ============================================
    // PAYMENT METHODS (NEW)
    // ============================================
    paymentMethods: [
      {
        type: {
          type: String,
          enum: ["card", "bank", "crypto", "paypal"],
          required: true,
        },
        card: {
          brand: String, // visa, mastercard, amex
          last4: String,
          expiryMonth: Number,
          expiryYear: Number,
          holderName: String,
        },
        bank: {
          bankName: String,
          accountLast4: String,
          accountType: String,
        },
        crypto: {
          currency: String, // BTC, ETH, USDT, USDC
          walletAddress: String,
        },
        paypal: {
          email: String,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================
    // BILLING HISTORY (NEW)
    // ============================================
    billingHistory: [
      {
        invoiceNumber: {
          type: String,
          required: true,
          unique: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          default: "USD",
        },
        status: {
          type: String,
          enum: ["paid", "pending", "failed", "refunded"],
          default: "pending",
        },
        description: {
          type: String,
        },
        paymentMethodType: String,
        billingDate: {
          type: Date,
          default: Date.now,
        },
        paidAt: {
          type: Date,
        },
        invoiceUrl: {
          type: String,
        },
      },
    ],

    // ============================================
    // ACCOUNT MANAGEMENT (ENHANCED)
    // ============================================
    lastLogin: Date,
    deactivatedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// ============================================
// MIDDLEWARE
// ============================================

// Encrypt password before saving
merchantSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================
// INSTANCE METHODS
// ============================================

// Match password
merchantSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
merchantSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Update statistics
merchantSchema.methods.updateStats = async function (transaction) {
  this.statistics.totalTransactions += 1;
  if (transaction.status === "success") {
    this.statistics.successfulTransactions += 1;
    this.statistics.totalRevenue += transaction.amount;
  } else if (transaction.status === "failed") {
    this.statistics.failedTransactions += 1;
  }
  await this.save();
};

// Add login history entry
merchantSchema.methods.addLoginHistory = async function (loginData) {
  this.loginHistory.unshift(loginData);

  // Keep only last 50 login records
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(0, 50);
  }

  this.lastLogin = new Date();
  await this.save();
};

// Calculate next billing date
merchantSchema.methods.calculateNextBillingDate = function () {
  const { billingCycle, startDate } = this.billingPlan;
  const nextDate = new Date(startDate || Date.now());

  if (billingCycle === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (billingCycle === "yearly") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return nextDate;
};

// Update billing plan
merchantSchema.methods.updateBillingPlan = async function (planData) {
  this.billingPlan = {
    ...this.billingPlan,
    ...planData,
    startDate: planData.startDate || Date.now(),
  };

  this.billingPlan.nextBillingDate = this.calculateNextBillingDate();

  // Update tier to match plan
  this.tier = planData.planName;

  await this.save();
};

// Add payment method
merchantSchema.methods.addPaymentMethod = async function (methodData) {
  // If this is set as default, unset other defaults
  if (methodData.isDefault) {
    this.paymentMethods.forEach((pm) => {
      pm.isDefault = false;
    });
  }

  this.paymentMethods.push(methodData);
  await this.save();
};

// Add billing history entry
merchantSchema.methods.addBillingHistory = async function (billingData) {
  this.billingHistory.unshift(billingData);
  await this.save();
};

// Get masked account number
merchantSchema.methods.getMaskedAccountNumber = function () {
  if (!this.bankAccount.accountNumber) return "";
  const last4 = this.bankAccount.accountNumber.slice(-4);
  return `****${last4}`;
};

// Deactivate account
merchantSchema.methods.deactivateAccount = async function () {
  this.accountStatus = "deactivated";
  this.deactivatedAt = new Date();
  await this.save();
};

// Delete account (soft delete)
merchantSchema.methods.deleteAccount = async function () {
  this.accountStatus = "deleted";
  this.deletedAt = new Date();
  await this.save();
};

// Reactivate account
merchantSchema.methods.reactivateAccount = async function () {
  this.accountStatus = "active";
  this.deactivatedAt = null;
  await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

// Get active merchants count
merchantSchema.statics.getActiveMerchantsCount = async function () {
  return await this.countDocuments({ accountStatus: "active" });
};

// Get merchants by plan
merchantSchema.statics.getMerchantsByPlan = async function (planName) {
  return await this.find({ "billingPlan.planName": planName });
};

module.exports = mongoose.model("Merchant", merchantSchema);
