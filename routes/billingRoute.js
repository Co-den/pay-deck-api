const express = require("express");
const auth = require("../middleware/auth");
const billingController = require("../controllers/billingController");

const router = express.Router();

router.get("/billing-plan", auth.protect, billingController.getBillingPlan);

router.post("/subscribe-plan", auth.protect, billingController.subscribePlan);

router.post(
  "/payment-method",
  auth.protect,
  billingController.addPaymentMethod
);

router.get(
  "/payment-methods",
  auth.protect,
  billingController.getPaymentMethods
);
router.get(
  "/billing-history",
  auth.protect,
  billingController.getBillingHistory
);

module.exports = router;
