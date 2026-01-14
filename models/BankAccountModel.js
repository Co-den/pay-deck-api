const mongoose = require("mongoose");


const bankAccountSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true,
    trim: true,
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
  },
  accountNumber: {
    type: String,
    required: true,
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
    default: "monthly",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const BankAccount = mongoose.model("BankAccount", bankAccountSchema);

module.exports = BankAccount;