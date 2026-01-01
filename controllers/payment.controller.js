const Transaction = require('../models/Transaction.model');
const Merchant = require('../models/Merchant.model');
const { v4: uuidv4 } = require('uuid');
const { processPayment, calculateRiskScore } = require('../utils/paymentProcessor');
const { sendWebhook } = require('../utils/webhookService');

// @desc    Create a payment/charge
// @route   POST /api/payments/charge
// @access  Private (API Key)
exports.createPayment = async (req, res, next) => {
  try {
    const {
      amount,
      currency = 'USD',
      customer,
      paymentMethod,
      description,
      metadata
    } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid amount is required'
      });
    }

    if (!customer || !customer.email) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer email is required'
      });
    }

    if (!paymentMethod || !paymentMethod.type) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment method is required'
      });
    }

    // Generate unique transaction ID
    const transactionId = `txn_${uuidv4().replace(/-/g, '')}`;

    // Calculate risk score
    const riskScore = calculateRiskScore({
      amount,
      customerEmail: customer.email,
      ipAddress: req.ip
    });

    // Create transaction
    const transaction = await Transaction.create({
      transactionId,
      merchant: req.merchant._id,
      customer: {
        ...customer,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      },
      amount,
      currency: currency.toUpperCase(),
      paymentMethod,
      description,
      metadata,
      riskScore,
      status: 'processing'
    });

    // Process payment (mock or real processor)
    const paymentResult = await processPayment({
      transaction,
      paymentMethod,
      merchant: req.merchant
    });

    // Update transaction with result
    transaction.status = paymentResult.success ? 'success' : 'failed';
    transaction.processedAt = new Date();
    
    if (paymentResult.success) {
      transaction.providerTransactionId = paymentResult.providerTransactionId;
    } else {
      transaction.failureReason = {
        code: paymentResult.errorCode,
        message: paymentResult.errorMessage
      };
    }

    await transaction.save();

    // Update merchant statistics
    await req.merchant.updateStats(transaction);

    // Send webhook
    const webhookEvent = paymentResult.success ? 'payment.success' : 'payment.failed';
    await sendWebhook(req.merchant._id, webhookEvent, transaction);

    // Response
    res.status(paymentResult.success ? 200 : 400).json({
      status: paymentResult.success ? 'success' : 'error',
      message: paymentResult.success ? 'Payment processed successfully' : 'Payment failed',
      data: {
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        ...(paymentResult.success ? {
          fees: transaction.fees
        } : {
          failureReason: transaction.failureReason
        })
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a payment link
// @route   POST /api/payments/links
// @access  Private
exports.createPaymentLink = async (req, res, next) => {
  try {
    const { amount, currency = 'USD', description, expiresIn = 24 } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid amount is required'
      });
    }

    const linkId = `link_${uuidv4().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

    // In production, store this in a PaymentLink model
    const paymentLink = {
      linkId,
      merchant: req.merchant._id,
      amount,
      currency,
      description,
      expiresAt,
      url: `${process.env.FRONTEND_URL}/pay/${linkId}`
    };

    res.status(201).json({
      status: 'success',
      message: 'Payment link created successfully',
      data: paymentLink
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment/transaction by ID
// @route   GET /api/payments/:transactionId
// @access  Private (API Key)
exports.getPayment = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
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

// @desc    Refund a payment
// @route   POST /api/payments/:transactionId/refund
// @access  Private (API Key with refund permission)
exports.refundPayment = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;

    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      merchant: req.merchant._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'success') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only refund successful transactions'
      });
    }

    const refundAmount = amount || transaction.amount;

    if (refundAmount > transaction.amount - transaction.refund.refundedAmount) {
      return res.status(400).json({
        status: 'error',
        message: 'Refund amount exceeds available amount'
      });
    }

    // Process refund
    await transaction.processRefund(refundAmount, reason);

    // Update merchant statistics
    req.merchant.statistics.totalRefunds += refundAmount;
    await req.merchant.save();

    // Send webhook
    await sendWebhook(req.merchant._id, 'refund.processed', transaction);

    res.status(200).json({
      status: 'success',
      message: 'Refund processed successfully',
      data: {
        transactionId: transaction.transactionId,
        refundedAmount: refundAmount,
        status: transaction.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a pending payment
// @route   POST /api/payments/:transactionId/cancel
// @access  Private (API Key)
exports.cancelPayment = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      merchant: req.merchant._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'pending' && transaction.status !== 'processing') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only cancel pending or processing transactions'
      });
    }

    transaction.status = 'cancelled';
    await transaction.save();

    // Send webhook
    await sendWebhook(req.merchant._id, 'payment.cancelled', transaction);

    res.status(200).json({
      status: 'success',
      message: 'Payment cancelled successfully',
      data: {
        transactionId: transaction.transactionId,
        status: transaction.status
      }
    });
  } catch (error) {
    next(error);
  }
};
