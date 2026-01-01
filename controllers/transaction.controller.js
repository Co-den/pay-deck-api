const Transaction = require('../models/Transaction.model');

// @desc    Get all transactions for merchant
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const {
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      customerEmail,
      page = 1,
      limit = 20,
      sortBy = '-createdAt'
    } = req.query;

    // Build query
    const query = { merchant: req.merchant._id };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    if (customerEmail) {
      query['customer.email'] = { $regex: customerEmail, $options: 'i' };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const transactions = await Transaction.find(query)
      .sort(sortBy)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Transaction.countDocuments(query);

    // Calculate statistics
    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$fees.totalFee' },
          avgAmount: { $avg: '$amount' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        statistics: stats[0] || {
          totalAmount: 0,
          totalFees: 0,
          avgAmount: 0,
          successCount: 0,
          failedCount: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      merchant: req.merchant._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get transaction analytics
// @route   GET /api/transactions/analytics/summary
// @access  Private
exports.getAnalytics = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Overall statistics
    const overallStats = await Transaction.aggregate([
      {
        $match: {
          merchant: req.merchant._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0]
            }
          },
          totalFees: {
            $sum: {
              $cond: [{ $eq: ['$status', 'success'] }, '$fees.totalFee', 0]
            }
          },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          avgTransactionAmount: {
            $avg: {
              $cond: [{ $eq: ['$status', 'success'] }, '$amount', null]
            }
          }
        }
      }
    ]);

    // Daily breakdown
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          merchant: req.merchant._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          transactions: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0]
            }
          },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Payment method breakdown
    const paymentMethodStats = await Transaction.aggregate([
      {
        $match: {
          merchant: req.merchant._id,
          createdAt: { $gte: startDate },
          status: 'success'
        }
      },
      {
        $group: {
          _id: '$paymentMethod.type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const stats = overallStats[0] || {
      totalTransactions: 0,
      totalRevenue: 0,
      totalFees: 0,
      successCount: 0,
      failedCount: 0,
      avgTransactionAmount: 0
    };

    // Calculate success rate
    stats.successRate = stats.totalTransactions > 0
      ? ((stats.successCount / stats.totalTransactions) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        period,
        overview: stats,
        dailyTrends: dailyStats,
        paymentMethods: paymentMethodStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export transactions
// @route   GET /api/transactions/export
// @access  Private
exports.exportTransactions = async (req, res, next) => {
  try {
    const { format = 'json', ...filters } = req.query;

    const query = { merchant: req.merchant._id };
    
    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.startDate) query.createdAt = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = new Date(filters.endDate);
    }

    const transactions = await Transaction.find(query)
      .sort('-createdAt')
      .limit(10000) // Limit export to 10k records
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(transactions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        status: 'success',
        data: { transactions }
      });
    }
  } catch (error) {
    next(error);
  }
};

// Helper function to convert to CSV
function convertToCSV(transactions) {
  const headers = [
    'Transaction ID',
    'Date',
    'Customer Email',
    'Amount',
    'Currency',
    'Status',
    'Payment Method',
    'Fees'
  ];

  const rows = transactions.map(t => [
    t.transactionId,
    t.createdAt.toISOString(),
    t.customer.email,
    t.amount,
    t.currency,
    t.status,
    t.paymentMethod.type,
    t.fees.totalFee
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

module.exports = exports;
