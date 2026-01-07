const PaymentLink = require("../models/PaymentLink.model");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

// Generate unique short code for payment link
function generateShortCode() {
  return crypto.randomBytes(4).toString("hex");
}

exports.getPaymentLinks = async (req, res, next) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const query = { merchant: req.merchant._id };
    if (status) query.status = status;

    const paymentLinks = await PaymentLink.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await PaymentLink.countDocuments(query);

    res.status(200).json({
      status: "success",
      data: {
        paymentLinks,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment link
// @route   GET /api/payment-links/:id
// @access  Private
exports.getPaymentLink = async (req, res, next) => {
  try {
    const paymentLink = await PaymentLink.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentLink) {
      return res.status(404).json({
        status: "error",
        message: "Payment link not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { paymentLink },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment link by short code (public)
// @route   GET /api/payment-links/public/:shortCode
// @access  Public
exports.getPaymentLinkByCode = async (req, res, next) => {
  try {
    const paymentLink = await PaymentLink.findOne({
      shortCode: req.params.shortCode,
    }).populate("merchant", "businessName email");

    if (!paymentLink) {
      return res.status(404).json({
        status: "error",
        message: "Payment link not found",
      });
    }

    // Check if link is active
    if (paymentLink.status !== "active") {
      return res.status(400).json({
        status: "error",
        message: "This payment link is no longer active",
      });
    }

    // Check if expired
    if (paymentLink.expiresAt && new Date(paymentLink.expiresAt) < new Date()) {
      paymentLink.status = "expired";
      await paymentLink.save();

      return res.status(400).json({
        status: "error",
        message: "This payment link has expired",
      });
    }

    // Check if max uses reached
    if (paymentLink.maxUses && paymentLink.currentUses >= paymentLink.maxUses) {
      paymentLink.status = "expired";
      await paymentLink.save();

      return res.status(400).json({
        status: "error",
        message: "This payment link has reached its maximum uses",
      });
    }

    // Increment view count
    paymentLink.stats.totalViews += 1;
    await paymentLink.save();

    res.status(200).json({
      status: "success",
      data: { paymentLink },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment link
// @route   POST /api/payment-links
// @access  Private
exports.createPaymentLink = async (req, res, next) => {
  try {
    const {
      title,
      description,
      amount,
      currency,
      expiresAt,
      maxUses,
      settings,
      metadata,
    } = req.body;

    // Validate required fields
    if (!title || !amount || !currency) {
      return res.status(400).json({
        status: "error",
        message: "Title, amount, and currency are required",
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Amount must be greater than 0",
      });
    }

    // Generate unique short code
    let shortCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      shortCode = generateShortCode();
      const existing = await PaymentLink.findOne({ shortCode });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        status: "error",
        message: "Failed to generate unique link code. Please try again.",
      });
    }

    // Get base URL from environment or request
    const baseUrl =
      process.env.PAYMENT_LINK_BASE_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000" ||
      "https://pay-deck.vercel.app";

    const url = `${baseUrl}/pay/${shortCode}`;

    // Create payment link
    const paymentLink = await PaymentLink.create({
      merchant: req.merchant._id,
      title,
      description,
      amount,
      currency,
      url,
      shortCode,
      expiresAt: expiresAt || null,
      maxUses: maxUses || null,
      settings: settings || {},
      metadata: metadata || {},
      status: "active",
      currentUses: 0,
      stats: {
        totalRevenue: 0,
        successfulPayments: 0,
        failedPayments: 0,
        totalViews: 0,
        conversionRate: 0,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Payment link created successfully",
      data: { paymentLink },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment link
// @route   PUT /api/payment-links/:id
// @access  Private
exports.updatePaymentLink = async (req, res, next) => {
  try {
    const paymentLink = await PaymentLink.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentLink) {
      return res.status(404).json({
        status: "error",
        message: "Payment link not found",
      });
    }

    const {
      title,
      description,
      amount,
      currency,
      status,
      expiresAt,
      maxUses,
      settings,
      metadata,
    } = req.body;

    // Update fields
    if (title) paymentLink.title = title;
    if (description !== undefined) paymentLink.description = description;
    if (amount) paymentLink.amount = amount;
    if (currency) paymentLink.currency = currency;
    if (status) paymentLink.status = status;
    if (expiresAt !== undefined) paymentLink.expiresAt = expiresAt;
    if (maxUses !== undefined) paymentLink.maxUses = maxUses;
    if (settings) {
      paymentLink.settings = { ...paymentLink.settings, ...settings };
    }
    if (metadata) {
      paymentLink.metadata = { ...paymentLink.metadata, ...metadata };
    }

    await paymentLink.save();

    res.status(200).json({
      status: "success",
      message: "Payment link updated successfully",
      data: { paymentLink },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment link
// @route   DELETE /api/payment-links/:id
// @access  Private
exports.deletePaymentLink = async (req, res, next) => {
  try {
    const paymentLink = await PaymentLink.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentLink) {
      return res.status(404).json({
        status: "error",
        message: "Payment link not found",
      });
    }

    await paymentLink.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Payment link deleted successfully",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable payment link
// @route   POST /api/payment-links/:id/disable
// @access  Private
exports.disablePaymentLink = async (req, res, next) => {
  try {
    const paymentLink = await PaymentLink.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentLink) {
      return res.status(404).json({
        status: "error",
        message: "Payment link not found",
      });
    }

    paymentLink.status = "disabled";
    await paymentLink.save();

    res.status(200).json({
      status: "success",
      message: "Payment link disabled successfully",
      data: { paymentLink },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enable payment link
// @route   POST /api/payment-links/:id/enable
// @access  Private
exports.enablePaymentLink = async (req, res, next) => {
  try {
    const paymentLink = await PaymentLink.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentLink) {
      return res.status(404).json({
        status: "error",
        message: "Payment link not found",
      });
    }

    // Check if expired
    if (paymentLink.expiresAt && new Date(paymentLink.expiresAt) < new Date()) {
      return res.status(400).json({
        status: "error",
        message: "Cannot enable expired payment link",
      });
    }

    // Check if max uses reached
    if (paymentLink.maxUses && paymentLink.currentUses >= paymentLink.maxUses) {
      return res.status(400).json({
        status: "error",
        message: "Cannot enable payment link that has reached maximum uses",
      });
    }

    paymentLink.status = "active";
    await paymentLink.save();

    res.status(200).json({
      status: "success",
      message: "Payment link enabled successfully",
      data: { paymentLink },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment link statistics
// @route   GET /api/payment-links/stats
// @access  Private
exports.getPaymentLinkStats = async (req, res, next) => {
  try {
    const paymentLinks = await PaymentLink.find({
      merchant: req.merchant._id,
    });

    const stats = {
      totalLinks: paymentLinks.length,
      activeLinks: paymentLinks.filter((l) => l.status === "active").length,
      totalUses: paymentLinks.reduce((sum, l) => sum + l.currentUses, 0),
      totalRevenue: paymentLinks.reduce(
        (sum, l) => sum + l.stats.totalRevenue,
        0
      ),
      averageOrderValue: 0,
      topPerformingLinks: [],
    };

    // Calculate average order value
    if (stats.totalUses > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalUses;
    }

    // Get top performing links
    stats.topPerformingLinks = paymentLinks
      .sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue)
      .slice(0, 5)
      .map((link) => ({
        id: link._id,
        title: link.title,
        revenue: link.stats.totalRevenue,
        uses: link.currentUses,
      }));

    res.status(200).json({
      status: "success",
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate QR code for payment link
// @route   GET /api/payment-links/:id/qr
// @access  Private
exports.getPaymentLinkQR = async (req, res, next) => {
  try {
    const paymentLink = await PaymentLink.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentLink) {
      return res.status(404).json({
        status: "error",
        message: "Payment link not found",
      });
    }

    // Generate QR code using qrcode library
    const QRCode = require("qrcode");
    const qrCode = await QRCode.toDataURL(paymentLink.url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    res.status(200).json({
      status: "success",
      data: { qrCode },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
