const mongoose = require("mongoose");

// Payment Method Schema
const paymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["card", "bank", "crypto", "paypal"],
    required: true,
  },
  card: {
    brand: String,
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
    currency: String,
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
});
module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
