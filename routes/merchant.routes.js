const express = require('express');
const router = express.Router();
const Merchant = require('../models/Merchant.model');
const { protect } = require('../middleware/auth');

// All merchant routes require authentication
router.use(protect);

// @desc    Get merchant profile
// @route   GET /api/merchant/profile
router.get('/profile', async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    res.status(200).json({
      status: 'success',
      data: { merchant }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update merchant profile
// @route   PUT /api/merchant/profile
router.put('/profile', async (req, res, next) => {
  try {
    const allowedFields = [
      'businessName',
      'phone',
      'address',
      'website',
      'businessType'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field]) {
        updates[field] = req.body[field];
      }
    });

    const merchant = await Merchant.findByIdAndUpdate(
      req.merchant._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { merchant }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update merchant settings
// @route   PUT /api/merchant/settings
router.put('/settings', async (req, res, next) => {
  try {
    const { webhookUrl, notificationEmail, currency, autoSettle, settlementSchedule } = req.body;

    const merchant = await Merchant.findById(req.merchant._id);

    if (webhookUrl !== undefined) merchant.settings.webhookUrl = webhookUrl;
    if (notificationEmail !== undefined) merchant.settings.notificationEmail = notificationEmail;
    if (currency !== undefined) merchant.settings.currency = currency;
    if (autoSettle !== undefined) merchant.settings.autoSettle = autoSettle;
    if (settlementSchedule !== undefined) merchant.settings.settlementSchedule = settlementSchedule;

    await merchant.save();

    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully',
      data: { settings: merchant.settings }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update bank account
// @route   PUT /api/merchant/bank-account
router.put('/bank-account', async (req, res, next) => {
  try {
    const { accountName, accountNumber, bankName, routingNumber } = req.body;

    const merchant = await Merchant.findById(req.merchant._id);

    merchant.bankAccount = {
      accountName,
      accountNumber,
      bankName,
      routingNumber
    };

    merchant.verificationStatus.isBankVerified = true;

    await merchant.save();

    res.status(200).json({
      status: 'success',
      message: 'Bank account updated successfully',
      data: { bankAccount: merchant.bankAccount }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get merchant statistics
// @route   GET /api/merchant/statistics
router.get('/statistics', async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);

    res.status(200).json({
      status: 'success',
      data: { statistics: merchant.statistics }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get merchant dashboard summary
// @route   GET /api/merchant/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const Transaction = require('../models/Transaction.model');
    
    // Get recent transactions
    const recentTransactions = await Transaction.find({ merchant: req.merchant._id })
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Get today's stats
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayStats = await Transaction.aggregate([
      {
        $match: {
          merchant: req.merchant._id,
          createdAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: null,
          todayTransactions: { $sum: 1 },
          todayRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] }
          }
        }
      }
    ]);

    const merchant = await Merchant.findById(req.merchant._id);

    res.status(200).json({
      status: 'success',
      data: {
        merchant: {
          businessName: merchant.businessName,
          tier: merchant.tier,
          accountStatus: merchant.accountStatus
        },
        statistics: merchant.statistics,
        today: todayStats[0] || { todayTransactions: 0, todayRevenue: 0 },
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
