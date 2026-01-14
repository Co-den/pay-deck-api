const Merchant = require("../models/MerchantModel");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const merchant = await Merchant.findById(req.user.id).select("+password");

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Verify current password
    const isMatch = await merchant.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Update password
    merchant.password = newPassword;
    await merchant.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.setupTwoFactorAuth = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `PayDeck (${merchant.email})`,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => ({
      code: crypto.randomBytes(4).toString("hex").toUpperCase(),
      used: false,
    }));

    // Save secret temporarily (will be confirmed after verification)
    merchant.twoFactorAuth = {
      ...merchant.twoFactorAuth,
      secret: secret.base32,
      backupCodes,
    };

    await merchant.save();

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: backupCodes.map((bc) => bc.code),
    });
  } catch (error) {
    console.error("Setup 2FA error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.verifyTwoFactorAuth = async (req, res) => {
  try {
    const { token } = req.body;

    const merchant = await Merchant.findById(req.user.id);

    if (!merchant || !merchant.twoFactorAuth.secret) {
      return res.status(400).json({ error: "2FA not set up" });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: merchant.twoFactorAuth.secret,
      encoding: "base32",
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ error: "Invalid verification code" });
    }

    // Enable 2FA
    merchant.twoFactorAuth.enabled = true;
    merchant.twoFactorAuth.enabledAt = new Date();
    await merchant.save();

    res.json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.disableTwoFactorAuth = async (req, res) => {
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

    // Disable 2FA
    merchant.twoFactorAuth.enabled = false;
    merchant.twoFactorAuth.secret = undefined;
    merchant.twoFactorAuth.backupCodes = [];
    await merchant.save();

    res.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    res.json({
      success: true,
      loginHistory: merchant.loginHistory || [],
    });
  } catch (error) {
    console.error("Get login history error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
