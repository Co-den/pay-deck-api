const mongoose = require("mongoose");


const loginHistorySchema = new mongoose.Schema({
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
});

module.exports = mongoose.model("LoginHistory", loginHistorySchema);
