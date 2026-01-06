const PaymentMethod = require("../models/PaymentMethod.model");


exports.getPaymentMethods = async (req, res, next) => {
  try {
    const paymentMethods = await PaymentMethod.find({
      merchant: req.merchant._id,
    }).sort("displayOrder");

    res.status(200).json({
      status: "success",
      data: { paymentMethods },
    });
  } catch (error) {
    next(error);
  }
};


exports.getPaymentMethod = async (req, res, next) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        status: "error",
        message: "Payment method not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { paymentMethod },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment method configuration
// @route   PUT /api/payment-methods/:id
// @access  Private
exports.updatePaymentMethod = async (req, res, next) => {
  try {
    const { enabled, configuration, fees, limits } = req.body;

    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        status: "error",
        message: "Payment method not found",
      });
    }

    // Update fields
    if (typeof enabled !== "undefined") paymentMethod.enabled = enabled;
    if (configuration) {
      paymentMethod.configuration = {
        ...paymentMethod.configuration,
        ...configuration,
      };
    }
    if (fees) {
      paymentMethod.fees = {
        ...paymentMethod.fees,
        ...fees,
      };
    }
    if (limits) {
      paymentMethod.limits = {
        ...paymentMethod.limits,
        ...limits,
      };
    }

    // Mark setup as complete if API keys are provided
    if (
      configuration &&
      (configuration.publicKey ||
        configuration.secretKey ||
        configuration.apiKey)
    ) {
      paymentMethod.setupComplete = true;
    }

    await paymentMethod.save();

    res.status(200).json({
      status: "success",
      message: "Payment method updated successfully",
      data: { paymentMethod },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enable payment method
// @route   POST /api/payment-methods/:id/enable
// @access  Private
exports.enablePaymentMethod = async (req, res, next) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        status: "error",
        message: "Payment method not found",
      });
    }

    // Check if setup is complete
    if (!paymentMethod.setupComplete) {
      return res.status(400).json({
        status: "error",
        message: "Payment method setup must be completed before enabling",
      });
    }

    paymentMethod.enabled = true;
    paymentMethod.isActive = true;
    await paymentMethod.save();

    res.status(200).json({
      status: "success",
      message: "Payment method enabled successfully",
      data: { paymentMethod },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable payment method
// @route   POST /api/payment-methods/:id/disable
// @access  Private
exports.disablePaymentMethod = async (req, res, next) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        status: "error",
        message: "Payment method not found",
      });
    }

    paymentMethod.enabled = false;
    paymentMethod.isActive = false;
    await paymentMethod.save();

    res.status(200).json({
      status: "success",
      message: "Payment method disabled successfully",
      data: { paymentMethod },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test payment method configuration
// @route   POST /api/payment-methods/:id/test
// @access  Private
exports.testPaymentMethod = async (req, res, next) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      merchant: req.merchant._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        status: "error",
        message: "Payment method not found",
      });
    }

    // Test the connection based on provider
    let testResult = { success: false, message: "Test not implemented" };

    switch (paymentMethod.provider.toLowerCase()) {
      case "paystack":
        testResult = await testPaystackConnection(paymentMethod.configuration);
        break;
      case "flutterwave":
        testResult = await testFlutterwaveConnection(
          paymentMethod.configuration
        );
        break;
      case "stripe":
        testResult = await testStripeConnection(paymentMethod.configuration);
        break;
      case "coinbase commerce":
        testResult = await testCoinbaseConnection(paymentMethod.configuration);
        break;
      case "yellow card":
        testResult = await testYellowCardConnection(
          paymentMethod.configuration
        );
        break;
      case "binance pay":
        testResult = await testBinancePayConnection(
          paymentMethod.configuration
        );
        break;
      default:
        testResult = {
          success: false,
          message: "Testing not supported for this provider",
        };
    }

    res.status(200).json({
      status: "success",
      data: testResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment method statistics
// @route   GET /api/payment-methods/stats
// @access  Private
exports.getPaymentMethodStats = async (req, res, next) => {
  try {
    const paymentMethods = await PaymentMethod.find({
      merchant: req.merchant._id,
    });

    // Calculate stats
    const stats = {
      totalMethods: paymentMethods.length,
      activeMethods: paymentMethods.filter((m) => m.enabled).length,
      transactionsLast30Days: {},
      averageFee: 0,
    };

    // Calculate average fee
    if (paymentMethods.length > 0) {
      const totalFee = paymentMethods.reduce(
        (sum, m) => sum + m.fees.percentage,
        0
      );
      stats.averageFee = totalFee / paymentMethods.length;
    }

    // TODO: Add transaction statistics from Transaction model

    res.status(200).json({
      status: "success",
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initialize default payment methods for merchant
// @route   POST /api/payment-methods/initialize
// @access  Private
exports.initializePaymentMethods = async (req, res, next) => {
  try {
    // Check if merchant already has payment methods
    const existingMethods = await PaymentMethod.findOne({
      merchant: req.merchant._id,
    });

    if (existingMethods) {
      return res.status(400).json({
        status: "error",
        message: "Payment methods already initialized for this merchant",
      });
    }

    // Default payment methods for Nigerian merchants
    const defaultMethods = [
      {
        merchant: req.merchant._id,
        name: "Cards (Paystack)",
        type: "card",
        provider: "Paystack",
        description: "Accept Visa, Mastercard, and Verve cards",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          publicKey: "",
          secretKey: "",
        },
        fees: {
          percentage: 1.5,
          fixedAmount: 0,
          cap: 2000,
        },
        limits: {
          min: 100,
          max: 5000000,
        },
        supportedCurrencies: ["NGN", "USD", "GHS", "ZAR", "KES"],
        supportedCountries: ["NG", "GH", "ZA", "KE"],
        settlementPeriod: "T+1",
        features: ["3D Secure", "Save Card", "Recurring Payments"],
        displayOrder: 1,
      },
      {
        merchant: req.merchant._id,
        name: "Bank Transfer",
        type: "bank_transfer",
        provider: "Paystack",
        description: "Direct bank account transfers",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          publicKey: "",
          secretKey: "",
        },
        fees: {
          percentage: 0.5,
          fixedAmount: 50,
          cap: 2000,
        },
        limits: {
          min: 100,
          max: 10000000,
        },
        supportedCurrencies: ["NGN"],
        supportedCountries: ["NG"],
        settlementPeriod: "T+1",
        features: ["Instant Verification", "Auto-settle"],
        displayOrder: 2,
      },
      {
        merchant: req.merchant._id,
        name: "USSD",
        type: "ussd",
        provider: "Paystack",
        description: "Pay with USSD codes from any bank",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          publicKey: "",
          secretKey: "",
        },
        fees: {
          percentage: 1.5,
          fixedAmount: 0,
          cap: 2000,
        },
        limits: {
          min: 100,
          max: 1000000,
        },
        supportedCurrencies: ["NGN"],
        supportedCountries: ["NG"],
        settlementPeriod: "T+1",
        features: ["No Internet Required", "All Banks"],
        displayOrder: 3,
      },
      {
        merchant: req.merchant._id,
        name: "Cards (Flutterwave)",
        type: "card",
        provider: "Flutterwave",
        description: "Accept cards via Flutterwave",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          publicKey: "",
          secretKey: "",
          encryptionKey: "",
        },
        fees: {
          percentage: 1.4,
          fixedAmount: 0,
          cap: 2000,
        },
        limits: {
          min: 100,
          max: 5000000,
        },
        supportedCurrencies: ["NGN", "USD", "GHS", "KES", "ZAR", "UGX", "TZS"],
        supportedCountries: ["NG", "GH", "KE", "ZA", "UG", "TZ"],
        settlementPeriod: "T+1",
        features: ["Global Cards", "Multi-currency", "Tokenization"],
        displayOrder: 4,
      },
      {
        merchant: req.merchant._id,
        name: "Mobile Money",
        type: "mobile_money",
        provider: "Flutterwave",
        description: "MTN, Airtel, Vodafone mobile money",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          publicKey: "",
          secretKey: "",
        },
        fees: {
          percentage: 1.4,
          fixedAmount: 0,
          cap: 2000,
        },
        limits: {
          min: 100,
          max: 2000000,
        },
        supportedCurrencies: ["NGN", "GHS", "UGX", "KES"],
        supportedCountries: ["NG", "GH", "UG", "KE"],
        settlementPeriod: "T+1",
        features: ["MTN", "Airtel", "Vodafone"],
        displayOrder: 5,
      },
      {
        merchant: req.merchant._id,
        name: "Cryptocurrency (Coinbase Commerce)",
        type: "crypto",
        provider: "Coinbase Commerce",
        description:
          "Accept Bitcoin, Ethereum, USDC, USDT and other cryptocurrencies",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          apiKey: "",
          webhookSecret: "",
        },
        fees: {
          percentage: 1.0,
          fixedAmount: 0,
          cap: 0,
        },
        limits: {
          min: 1000,
          max: 100000000,
        },
        supportedCurrencies: [
          "BTC",
          "ETH",
          "USDC",
          "USDT",
          "DAI",
          "BCH",
          "LTC",
          "DOGE",
        ],
        supportedCountries: [
          "NG",
          "GH",
          "KE",
          "ZA",
          "US",
          "GB",
          "CA",
          "GLOBAL",
        ],
        settlementPeriod: "T+0",
        features: [
          "Bitcoin",
          "Ethereum",
          "USDC",
          "USDT",
          "Instant Settlement",
          "Global",
        ],
        displayOrder: 6,
      },
      {
        merchant: req.merchant._id,
        name: "Cryptocurrency (Yellow Card)",
        type: "crypto",
        provider: "Yellow Card",
        description: "African crypto payment gateway - Bitcoin, USDT, USDC",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          apiKey: "",
          secretKey: "",
          merchantId: "",
        },
        fees: {
          percentage: 0.8,
          fixedAmount: 0,
          cap: 0,
        },
        limits: {
          min: 500,
          max: 50000000,
        },
        supportedCurrencies: ["BTC", "USDT", "USDC", "ETH"],
        supportedCountries: ["NG", "GH", "KE", "UG", "TZ", "ZA", "ZM", "BW"],
        settlementPeriod: "T+0",
        features: [
          "Bitcoin",
          "USDT",
          "USDC",
          "Instant Settlement",
          "African Focus",
          "Auto-convert to NGN",
        ],
        displayOrder: 7,
      },
      {
        merchant: req.merchant._id,
        name: "Cryptocurrency (Binance Pay)",
        type: "crypto",
        provider: "Binance Pay",
        description:
          "Accept crypto via Binance - Low fees, 300+ cryptocurrencies",
        enabled: false,
        setupComplete: false,
        configuration: {
          testMode: true,
          apiKey: "",
          secretKey: "",
          merchantId: "",
        },
        fees: {
          percentage: 0,
          fixedAmount: 0,
          cap: 0,
        },
        limits: {
          min: 100,
          max: 1000000000,
        },
        supportedCurrencies: [
          "BTC",
          "ETH",
          "USDT",
          "USDC",
          "BNB",
          "BUSD",
          "DAI",
          "TRX",
          "XRP",
          "ADA",
        ],
        supportedCountries: ["GLOBAL"],
        settlementPeriod: "T+0",
        features: [
          "300+ Cryptocurrencies",
          "Zero Fees",
          "Instant Settlement",
          "Binance Ecosystem",
        ],
        displayOrder: 8,
      },
    ];

    const paymentMethods = await PaymentMethod.insertMany(defaultMethods);

    res.status(201).json({
      status: "success",
      message: "Payment methods initialized successfully",
      data: { paymentMethods },
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions to test provider connections
async function testPaystackConnection(config) {
  try {
    const axios = require("axios");
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
      },
    });

    return {
      success: response.status === 200,
      message: "Paystack connection successful",
      details: {
        banks: response.data.data.length,
        currency: "NGN",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Paystack connection failed: " + error.message,
    };
  }
}

async function testFlutterwaveConnection(config) {
  try {
    const axios = require("axios");
    const response = await axios.get(
      "https://api.flutterwave.com/v3/banks/NG",
      {
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
        },
      }
    );

    return {
      success: response.status === 200,
      message: "Flutterwave connection successful",
      details: {
        banks: response.data.data.length,
        currency: "NGN",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Flutterwave connection failed: " + error.message,
    };
  }
}

async function testStripeConnection(config) {
  try {
    const stripe = require("stripe")(config.secretKey);
    const balance = await stripe.balance.retrieve();

    return {
      success: true,
      message: "Stripe connection successful",
      details: {
        available: balance.available,
        pending: balance.pending,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Stripe connection failed: " + error.message,
    };
  }
}

async function testCoinbaseConnection(config) {
  try {
    const axios = require("axios");
    const response = await axios.get(
      "https://api.commerce.coinbase.com/charges",
      {
        headers: {
          "X-CC-Api-Key": config.apiKey,
          "X-CC-Version": "2018-03-22",
        },
      }
    );

    return {
      success: response.status === 200,
      message: "Coinbase Commerce connection successful",
      details: {
        apiVersion: "2018-03-22",
        status: "connected",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Coinbase Commerce connection failed: " + error.message,
    };
  }
}

async function testYellowCardConnection(config) {
  try {
    const axios = require("axios");
    // Yellow Card API test endpoint
    const response = await axios.get(
      "https://api.yellowcard.io/business/rates",
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: response.status === 200,
      message: "Yellow Card connection successful",
      details: {
        rates: "available",
        currencies: "BTC, USDT, USDC, ETH",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Yellow Card connection failed: " + error.message,
    };
  }
}

async function testBinancePayConnection(config) {
  try {
    const axios = require("axios");
    const crypto = require("crypto");
    const timestamp = Date.now();

    // Binance Pay requires signature
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac("sha512", config.secretKey)
      .update(queryString)
      .digest("hex");

    const response = await axios.get(
      "https://bpay.binanceapi.com/binancepay/openapi/v2/order/query",
      {
        headers: {
          "Content-Type": "application/json",
          "BinancePay-Timestamp": timestamp,
          "BinancePay-Nonce": Math.random().toString(36).substring(7),
          "BinancePay-Certificate-SN": config.apiKey,
          "BinancePay-Signature": signature,
        },
      }
    );

    return {
      success: response.status === 200,
      message: "Binance Pay connection successful",
      details: {
        status: "connected",
        merchant: config.merchantId,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Binance Pay connection failed: " + error.message,
    };
  }
}

module.exports = exports;
