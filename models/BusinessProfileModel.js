const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const businessProfileSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  businessEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    trim: true,
  },
  taxId: {
    type: String,
    trim: true,
  },
  industry: {
    type: String,
    enum: ["ecommerce", "saas", "retail", "services", "nonprofit", "other"],
    default: "other",
  },
});







/

// Main User Schema
const userSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },

    // Business Profile
    businessProfile: businessProfileSchema,

    // Bank Account
    bankAccount: bankAccountSchema,

    // Notification Preferences
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },

    // Security
    twoFactorAuth: {
      type: twoFactorAuthSchema,
      default: () => ({}),
    },
    loginHistory: [loginHistorySchema],

    // Billing
    billingPlan: {
      type: billingPlanSchema,
      default: () => ({}),
    },
    paymentMethods: [paymentMethodSchema],
    billingHistory: [billingHistorySchema],

    // Account Status
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deactivated", "deleted"],
      default: "active",
    },
    deactivatedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Generate next billing date
userSchema.methods.calculateNextBillingDate = function () {
  const { billingCycle, startDate } = this.billingPlan;
  const nextDate = new Date(startDate);

  if (billingCycle === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (billingCycle === "yearly") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return nextDate;
};

// Add login history entry
userSchema.methods.addLoginHistory = async function (loginData) {
  this.loginHistory.unshift(loginData);

  // Keep only last 50 login records
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(0, 50);
  }

  this.lastLoginAt = new Date();
  await this.save();
};

const User = mongoose.model("User", userSchema);

module.exports = User;
