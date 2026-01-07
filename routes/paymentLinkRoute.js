const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getPaymentLinks,
  getPaymentLink,
  getPaymentLinkByCode,
  createPaymentLink,
  updatePaymentLink,
  deletePaymentLink,
  disablePaymentLink,
  enablePaymentLink,
  getPaymentLinkStats,
  getPaymentLinkQR,
} = require("../controllers/paymentLinkController");

// Public routes (no authentication)
router.get("/public/:shortCode", getPaymentLinkByCode);

// Protected routes (require authentication)
router.use(protect);

router.get("/stats", getPaymentLinkStats);

router.get("/", getPaymentLinks);

router.post("/", createPaymentLink);

router.get("/:id", getPaymentLink);

router.put("/:id", updatePaymentLink);

router.delete("/:id", deletePaymentLink);

router.post("/:id/disable", disablePaymentLink);

router.post("/:id/enable", enablePaymentLink);

router.get("/:id/qr", getPaymentLinkQR);

module.exports = router;
