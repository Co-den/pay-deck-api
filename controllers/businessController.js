const Merchant = require("../models/MerchantModel");

exports.getBusinessProfile = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    res.json({
      success: true,
      businessProfile: merchant.businessProfile || {},
    });
  } catch (error) {
    console.error("Get business profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update business profile
exports.updateBusinessProfile = async (req, res) => {
  try {
    const {
      businessName,
      website,
      description,
      phone,
      businessEmail,
      address,
      taxId,
      industry,
    } = req.body;

    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Update business profile
    merchant.businessProfile = {
      businessName,
      website,
      description,
      phone,
      businessEmail,
      address,
      taxId,
      industry,
    };

    await merchant.save();

    res.json({
      success: true,
      message: "Business profile updated successfully",
      businessProfile: merchant.businessProfile,
    });
  } catch (error) {
    console.error("Update business profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
