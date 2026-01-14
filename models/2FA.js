const mongoose = require("mongoose");


const twoFactorAuthSchema = new mongoose.Schema({
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
});
module.exports = mongoose.model("TwoFactorAuth", twoFactorAuthSchema);
