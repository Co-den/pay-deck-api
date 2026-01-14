const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

router.get(
  "/notification-preferences",
  auth.protect,
  notificationController.getNotificationPreferences
);

router.put(
  "/notification-preferences",
  auth.protect,
  notificationController.updateNotificationPreferences
);

module.exports = router;