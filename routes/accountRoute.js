const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const accountController = require("../controllers/accountController");

router.patch("/personal-info", auth.protect, accountController.updateInfo);

router.post(
  "/deactivate-account",
  auth.protect,
  accountController.deactivateAccount
);

router.delete("/delete-account", auth.protect, accountController.deleteAccount);
module.exports = router;
