const Merchant = require("../models/MerchantModel");

exports.getNotificationPreferences = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    res.json({
      success: true,
      notificationPreferences: merchant.notificationPreferences || {},
    });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email, sms, events } = req.body;

    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    merchant.notificationPreferences = {
      email: {
        enabled: email.enabled,
        address: email.address || merchant.email,
      },
      sms: {
        enabled: sms.enabled,
        phoneNumber: sms.phoneNumber || merchant.phone,
      },
      events,
    };

    await merchant.save();

    res.json({
      success: true,
      message: "Notification preferences updated successfully",
      notificationPreferences: merchant.notificationPreferences,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
