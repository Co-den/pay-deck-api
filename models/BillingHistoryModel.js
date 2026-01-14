const mongoose = require("mongoose");

const billingHistorySchema = new mongoose.Schema({
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
  paymentMethod: paymentMethodSchema,
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
});

module.exports = mongoose.model("BillingHistory", billingHistorySchema);
