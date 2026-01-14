const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const bankAccountController = require("../controllers/bankAccountController");

router.post(
  "/verify-bank-account",
  auth.protect,
  bankAccountController.verifyBankAccount
);

// Get bank account
router.get("/bank-account", auth.protect, bankAccountController.getBankAccount);

// Update bank account
router.put(
  "/bank-account",
  auth.protect,
  bankAccountController.updateBankAccount
);

module.exports = router;
