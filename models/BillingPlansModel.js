const mongoose = require("mongoose");

const billingPlanSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model("BillingPlan", billingPlanSchema);
