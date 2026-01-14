const mongoose = require("mongoose");

const notificationPreferencesSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model(
  "NotificationPreferences",
  notificationPreferencesSchema
);
