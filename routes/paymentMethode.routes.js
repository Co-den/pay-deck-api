const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getPaymentMethods,
  getPaymentMethod,
  updatePaymentMethod,
  enablePaymentMethod,
  disablePaymentMethod,
  testPaymentMethod,
  getPaymentMethodStats,
  initializePaymentMethods,
} = require("../controllers/paymentMethods.controller");

// All routes require authentication
router.use(protect);

// @route   GET /api/payment-methods/stats
// @desc    Get payment method statistics
router.get("/stats", getPaymentMethodStats);

// @route   POST /api/payment-methods/initialize
// @desc    Initialize default payment methods
router.post("/initialize", initializePaymentMethods);

// @route   GET /api/payment-methods
// @desc    Get all payment methods for merchant
router.get("/", getPaymentMethods);

// @route   GET /api/payment-methods/:id
// @desc    Get single payment method
router.get("/:id", getPaymentMethod);

// @route   PUT /api/payment-methods/:id
// @desc    Update payment method configuration
router.put("/:id", updatePaymentMethod);

// @route   POST /api/payment-methods/:id/enable
// @desc    Enable payment method
router.post("/:id/enable", enablePaymentMethod);

// @route   POST /api/payment-methods/:id/disable
// @desc    Disable payment method
router.post("/:id/disable", disablePaymentMethod);

// @route   POST /api/payment-methods/:id/test
// @desc    Test payment method connection
router.post("/:id/test", testPaymentMethod);

module.exports = router;
