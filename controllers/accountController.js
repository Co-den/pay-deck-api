const Merchant = require("../models/MerchantModel");

exports.updateInfo = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Check if email is already taken
    if (email && email !== merchant.email) {
      const existingMerchant = await Merchant.findOne({ email });
      if (existingMerchant) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    merchant.firstName = firstName || merchant.firstName;
    merchant.lastName = lastName || merchant.lastName;
    merchant.email = email || merchant.email;
    merchant.phone = phone || merchant.phone;

    await merchant.save();

    res.json({
      success: true,
      message: "Personal information updated successfully",
      merchant: {
        firstName: merchant.firstName,
        lastName: merchant.lastName,
        email: merchant.email,
        phone: merchant.phone,
      },
    });
  } catch (error) {
    console.error("Update personal info error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;

    const merchant = await Merchant.findById(req.user.id).select("+password");
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Verify password
    const isMatch = await merchant.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Password is incorrect" });
    }

    merchant.accountStatus = "deactivated";
    merchant.deactivatedAt = new Date();
    await merchant.save();

    res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate account error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (confirmation !== "DELETE") {
      return res.status(400).json({ error: "Invalid confirmation" });
    }

    const merchant = await Merchant.findById(req.user.id).select("+password");

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Verify password
    const isMatch = await merchant.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Password is incorrect" });
    }

    // Soft delete (mark as deleted but keep in database)
    merchant.accountStatus = "deleted";
    merchant.deletedAt = new Date();
    await merchant.save();

    // Alternatively, hard delete:
    // await Merchant.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
