const { v4: uuidv4 } = require("uuid");

/**
 * Mock payment processor
 * In production, this would integrate with real payment providers like Stripe, PayPal, etc.
 */

// Calculate risk score based on transaction details
exports.calculateRiskScore = ({ amount, customerEmail, ipAddress }) => {
  let score = 0;

  // High amount increases risk
  if (amount > 1000) score += 20;
  else if (amount > 500) score += 10;

  // New/disposable email patterns
  if (customerEmail.includes("temp") || customerEmail.includes("disposable")) {
    score += 30;
  }

  // Random base score (in production, use ML model or fraud service)
  score += Math.floor(Math.random() * 20);

  return Math.min(score, 100);
};

// Process payment through mock or real processor
exports.processPayment = async ({ transaction, paymentMethod, merchant }) => {
  // Simulate payment processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if using test or live mode
  const isTestMode =
    merchant.tier === "starter" || paymentMethod.type === "test";

  // Mock success/failure logic
  const shouldSucceed = determinePaymentSuccess(transaction, paymentMethod);

  if (shouldSucceed) {
    return {
      success: true,
      providerTransactionId: `prov_${uuidv4().replace(/-/g, "")}`,
      processorResponse: {
        authCode: generateAuthCode(),
        timestamp: new Date().toISOString(),
      },
    };
  } else {
    const errorCode = getRandomErrorCode();
    return {
      success: false,
      errorCode,
      errorMessage: getErrorMessage(errorCode),
    };
  }
};

// Determine if payment should succeed (mock logic)
function determinePaymentSuccess(transaction, paymentMethod) {
  // High risk transactions fail more often
  if (transaction.riskScore > 80) {
    return Math.random() > 0.7;
  }

  // Test card numbers
  if (paymentMethod.last4 === "0000" || paymentMethod.last4 === "0002") {
    return false; // Test decline
  }

  if (paymentMethod.last4 === "0001") {
    return true; // Test success
  }

  // Default 95% success rate
  return Math.random() > 0.05;
}

// Generate random authorization code
function generateAuthCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Get random error code for failed transactions
function getRandomErrorCode() {
  const errorCodes = [
    "insufficient_funds",
    "card_declined",
    "expired_card",
    "invalid_cvv",
    "processing_error",
    "bank_declined",
    "fraud_detected",
  ];
  return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

// Get error message for error code
function getErrorMessage(errorCode) {
  const messages = {
    insufficient_funds: "Insufficient funds in account",
    card_declined: "Card was declined by the issuing bank",
    expired_card: "Card has expired",
    invalid_cvv: "Invalid CVV/security code",
    processing_error: "An error occurred while processing the payment",
    bank_declined: "Transaction declined by bank",
    fraud_detected: "Transaction flagged as potentially fraudulent",
  };
  return messages[errorCode] || "Payment failed";
}

// Process refund
exports.processRefund = async ({ transaction, amount }) => {
  // Simulate refund processing
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    refundId: `refund_${uuidv4().replace(/-/g, "")}`,
    amount,
    timestamp: new Date().toISOString(),
  };
};

// Validate card details
exports.validateCard = (cardDetails) => {
  const { number, expiryMonth, expiryYear, cvv } = cardDetails;

  // Basic Luhn algorithm check
  if (!luhnCheck(number)) {
    return { valid: false, error: "Invalid card number" };
  }

  // Check expiry
  const now = new Date();
  const expiry = new Date(expiryYear, expiryMonth - 1);
  if (expiry < now) {
    return { valid: false, error: "Card has expired" };
  }

  // Check CVV
  if (!/^\d{3,4}$/.test(cvv)) {
    return { valid: false, error: "Invalid CVV" };
  }

  return { valid: true };
};

// Luhn algorithm for card validation
function luhnCheck(cardNumber) {
  const digits = cardNumber.replace(/\D/g, "").split("").map(Number);
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Detect card brand
exports.detectCardBrand = (cardNumber) => {
  const firstDigit = cardNumber.charAt(0);
  const firstTwo = cardNumber.substring(0, 2);
  const firstFour = cardNumber.substring(0, 4);

  if (firstDigit === "4") return "visa";
  if (firstTwo >= "51" && firstTwo <= "55") return "mastercard";
  if (firstTwo === "34" || firstTwo === "37") return "amex";
  if (firstFour === "6011" || firstTwo === "65") return "discover";

  return "unknown";
};

exports.verifyBankAccount = async (_accountNumber, _routingNumber) => {
  // TODO: Integrate with Plaid, Stripe, or other bank verification service

  // Mock verification logic
  return new Promise((resolve) => {
    setTimeout(() => {
      // Generate mock account name
      const mockNames = [
        "John Doe",
        "Jane Smith",
        "Tech Store Inc",
        "Business Account",
      ];

      const randomName =
        mockNames[Math.floor(Math.random() * mockNames.length)];
      resolve(randomName);
    }, 1000);
  });
};

// Mask account number
exports.maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return "";
  const last4 = accountNumber.slice(-4);
  return `****${last4}`;
};

// Get features by plan
exports.getFeaturesByPlan = (planName) => {
  const features = {
    free: {
      transactionLimit: 100,
      apiAccess: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
    starter: {
      transactionLimit: 1000,
      apiAccess: true,
      advancedAnalytics: false,
      prioritySupport: false,
    },
    business: {
      transactionLimit: 10000,
      apiAccess: true,
      advancedAnalytics: true,
      prioritySupport: false,
    },
    enterprise: {
      transactionLimit: -1, // unlimited
      apiAccess: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
  };

  return features[planName] || features.free;
};

// Generate invoice number
exports.generateInvoiceNumber = () => {
  const prefix = "INV";
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}-${random}`;
};

// Process payment (mock - integrate with real payment processor)
async function processPayment(user, amount, paymentMethodId) {
  // TODO: Integrate with Stripe, PayPal, crypto payment processor

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `txn_${Date.now()}`,
      });
    }, 1000);
  });
}

module.exports = exports;
