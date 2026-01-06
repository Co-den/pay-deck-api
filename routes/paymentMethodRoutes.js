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
} = require("../controllers/paymentMethodController");

router.use(protect);

router.get("/stats", getPaymentMethodStats);

router.post("/initialize", initializePaymentMethods);

router.get("/", getPaymentMethods);

router.get("/:id", getPaymentMethod);

router.put("/:id", updatePaymentMethod);

router.post("/:id/enable", enablePaymentMethod);

router.post("/:id/disable", disablePaymentMethod);

router.post("/:id/test", testPaymentMethod);

module.exports = router;
