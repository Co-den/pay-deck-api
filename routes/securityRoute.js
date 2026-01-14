const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const securityController = require("../controllers/securityController");

router.patch(
  "/change-password",
  auth.protect,
  securityController.changePassword
);

// Setup 2FA
router.post(
  "/setup-2fa",
  auth.protect,
  securityController.setupTwoFactorAuth
);

// Verify and enable 2FA
router.post(
  "/verify-2fa",
  auth.protect,
  securityController.verifyTwoFactorAuth
);

// Disable 2FA
router.post(
  "/disable-2fa",
  auth.protect,
  securityController.disableTwoFactorAuth
);

// Get login history
router.get(
  "/login-history",
  auth.protect,
  securityController.getLoginHistory
);
module.exports = router;
