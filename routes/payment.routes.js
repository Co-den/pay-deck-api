const express = require("express");
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
} = require("../controllers/payment.controller");

router.post("/create-intent", createPaymentIntent);

router.post("/confirm", confirmPayment);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

module.exports = router;
