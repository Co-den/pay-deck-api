const Merchant = require("../models/Merchant.model");
const ApiKey = require("../models/ApiKey.model");
const { validationResult } = require("express-validator");

// @desc    Register new merchant (Individual or Business)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        errors: errors.array(),
      });
    }

    const {
      businessName,
      email,
      password,
      businessType,
      phone,
      rcNumber, // Nigerian CAC Registration Number
      nin, // National Identity Number
      taxId, // Tax Identification Number
      accountType, // 'individual' or 'business'
    } = req.body;

    // Check if merchant already exists
    const existingMerchant = await Merchant.findOne({ email });
    if (existingMerchant) {
      return res.status(400).json({
        status: "error",
        message: "Merchant already exists with this email",
      });
    }

    // Validate business-specific fields if business account
    if (accountType === "business") {
      // Business accounts require verification documents
      if (!rcNumber || !nin || !taxId) {
        return res.status(400).json({
          status: "error",
          message:
            "Business accounts require RC Number, NIN, and Tax ID for verification",
        });
      }

      // Validate RC Number (Nigerian CAC format: RC + 6+ digits)
      const rcPattern = /^RC\d{6,}$/i;
      if (!rcPattern.test(rcNumber.replace(/\s/g, ""))) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid RC Number format. Must be RC followed by at least 6 digits",
        });
      }

      // Validate NIN (11 digits)
      const ninPattern = /^\d{11}$/;
      if (!ninPattern.test(nin.replace(/\s/g, ""))) {
        return res.status(400).json({
          status: "error",
          message: "Invalid National Identity Number. Must be 11 digits",
        });
      }

      // Validate Tax ID (10+ digits)
      const taxPattern = /^\d{10,}$/;
      if (!taxPattern.test(taxId.replace(/[\s-]/g, ""))) {
        return res.status(400).json({
          status: "error",
          message: "Invalid Tax ID format",
        });
      }

      // Check if RC Number already exists
      const existingRC = await Merchant.findOne({
        "businessVerification.rcNumber": rcNumber
          .replace(/\s/g, "")
          .toUpperCase(),
      });
      if (existingRC) {
        return res.status(400).json({
          status: "error",
          message: "A business with this RC Number is already registered",
        });
      }

      // Check if NIN already exists
      const existingNIN = await Merchant.findOne({
        "businessVerification.nin": nin.replace(/\s/g, ""),
      });
      if (existingNIN) {
        return res.status(400).json({
          status: "error",
          message: "This National Identity Number is already registered",
        });
      }
    }

    // Prepare merchant data
    const merchantData = {
      businessName,
      email,
      password,
      businessType: businessType || "individual",
      phone,
      accountStatus: accountType === "business" ? "pending" : "active",
    };

    // Add business verification data for business accounts
    if (accountType === "business") {
      merchantData.businessVerification = {
        rcNumber: rcNumber.replace(/\s/g, "").toUpperCase(),
        nin: nin.replace(/\s/g, ""),
        taxId: taxId.replace(/[\s-]/g, ""),
        verified: false, // Will be verified by admin
        verificationDate: null,
      };
    }

    // Create merchant
    const merchant = await Merchant.create(merchantData);

    // Generate default test API key for the merchant
    const testKeyData = ApiKey.generateKey('test');
    const testApiKey = await ApiKey.create({
      merchant: merchant._id,
      name: 'Test API Key',
      key: testKeyData.key,
      keyPrefix: testKeyData.keyPrefix,
      hashedKey: testKeyData.hashedKey,
      type: 'test',
      permissions: ['read', 'write']
    });

    // Generate default live API key for the merchant
    const liveKeyData = ApiKey.generateKey('live');
    const liveApiKey = await ApiKey.create({
      merchant: merchant._id,
      name: 'Live API Key',
      key: liveKeyData.key,
      keyPrefix: liveKeyData.keyPrefix,
      hashedKey: liveKeyData.hashedKey,
      type: 'live',
      permissions: ['read', 'write']
    });

    // Generate token
    const token = merchant.getSignedJwtToken();

    // Prepare response message
    let message = "Merchant registered successfully. Test and Live API keys have been generated for you.";
    if (accountType === "business") {
      message =
        "Business account created. Your documents will be verified within 24-48 hours. Test and Live API keys have been generated for you.";
    }

    res.status(201).json({
      status: "success",
      message,
      data: {
        token,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          email: merchant.email,
          tier: merchant.tier,
          accountStatus: merchant.accountStatus,
          businessType: merchant.businessType,
          verificationRequired: accountType === "business",
        },
        apiKeys: {
          test: {
            key: testKeyData.key, // Full test key shown only once during registration
            keyPrefix: testApiKey.keyPrefix,
            type: testApiKey.type,
            permissions: testApiKey.permissions,
            name: testApiKey.name
          },
          live: {
            key: liveKeyData.key, // Full live key shown only once during registration
            keyPrefix: liveApiKey.keyPrefix,
            type: liveApiKey.type,
            permissions: liveApiKey.permissions,
            name: liveApiKey.name
          }
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login merchant
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide email and password",
      });
    }

    // Check for merchant
    const merchant = await Merchant.findOne({ email }).select("+password");
    if (!merchant) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await merchant.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Check account status
    if (merchant.accountStatus === "suspended") {
      return res.status(403).json({
        status: "error",
        message: "Account is suspended. Please contact support.",
      });
    }

    if (merchant.accountStatus === "closed") {
      return res.status(403).json({
        status: "error",
        message: "Account is closed",
      });
    }

    // Check if pending verification
    if (merchant.accountStatus === "pending") {
      return res.status(403).json({
        status: "error",
        message:
          "Your account is pending verification. We will notify you once verified (24-48 hours).",
      });
    }

    // Update last login
    merchant.lastLogin = new Date();
    await merchant.save();

    // Generate token
    const token = merchant.getSignedJwtToken();

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        token,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          email: merchant.email,
          tier: merchant.tier,
          accountStatus: merchant.accountStatus,
          businessType: merchant.businessType,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in merchant
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.merchant.id);

    res.status(200).json({
      status: "success",
      data: { merchant },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout merchant
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
    data: {},
  });
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.merchant.id).select(
      "+password"
    );

    // Check current password
    const isMatch = await merchant.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    merchant.password = req.body.newPassword;
    await merchant.save();

    const token = merchant.getSignedJwtToken();

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify business account (Admin only)
// @route   PUT /api/auth/verify-business/:merchantId
// @access  Private/Admin
exports.verifyBusiness = async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId);

    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Merchant not found",
      });
    }

    if (!merchant.businessVerification) {
      return res.status(400).json({
        status: "error",
        message: "This account does not require verification",
      });
    }

    // Update verification status
    merchant.businessVerification.verified = true;
    merchant.businessVerification.verificationDate = new Date();
    merchant.accountStatus = "active";
    await merchant.save();

    // TODO: Send verification success email to merchant

    res.status(200).json({
      status: "success",
      message: "Business verified successfully",
      data: { merchant },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
