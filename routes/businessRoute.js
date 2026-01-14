const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const businessController = require("../controllers/businessController");

// Get business profile
router.get(
  "/business-profile",
  auth.protect,
  businessController.getBusinessProfile
);
router.put(
  "/business-profile",
  auth.protect,
  businessController.updateBusinessProfile
);

module.exports = router;
