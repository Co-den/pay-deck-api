const Merchant = require("../models/MerchantModel");
const {
  processPayment,
  generateInvoiceNumber,
  getFeaturesByPlan,
} = require("../utils/paymentProcessor");

exports.getBillingPlan = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    res.json({
      success: true,
      billingPlan: merchant.billingPlan || {},
    });
  } catch (error) {
    console.error("Get billing plan error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.subscribePlan = async (req, res) => {
  try {
    const { planName, billingCycle, paymentMethodId } = req.body;

    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Define plan prices
    const planPrices = {
      free: 0,
      starter: 29,
      business: 99,
      enterprise: 299,
    };

    const planPrice = planPrices[planName];
    const startDate = new Date();
    const nextBillingDate = new Date(startDate);

    if (billingCycle === "monthly") {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Update billing plan
    merchant.billingPlan = {
      planName,
      planPrice,
      billingCycle,
      startDate,
      nextBillingDate,
      status: "active",
      features: getFeaturesByPlan(planName),
    };

    // Process payment if not free plan
    if (planName !== "free" && paymentMethodId) {
      // TODO: Process payment with payment provider
      const payment = await processPayment(merchant, planPrice, paymentMethodId);

      if (payment.success) {
        // Create billing history entry
        merchant.billingHistory.unshift({
          invoiceNumber: generateInvoiceNumber(),
          amount: planPrice,
          status: "paid",
          description: `${planName} plan - ${billingCycle}`,
          paymentMethod: merchant.paymentMethods.find(
            (pm) => pm._id.toString() === paymentMethodId
          ),
          paidAt: new Date(),
        });
      }
    }

    await merchant.save();

    res.json({
      success: true,
      message: "Subscribed to plan successfully",
      billingPlan: merchant.billingPlan,
    });
  } catch (error) {
    console.error("Subscribe plan error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const { type, card, bank, crypto, paypal, isDefault } = req.body;

    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      merchant.paymentMethods.forEach((pm) => {
        pm.isDefault = false;
      });
    }

    // Add new payment method
    const paymentMethod = {
      type,
      card,
      bank,
      crypto,
      paypal,
      isDefault,
    };

    merchant.paymentMethods.push(paymentMethod);
    await merchant.save();

    res.json({
      success: true,
      message: "Payment method added successfully",
      paymentMethod,
    });
  } catch (error) {
    console.error("Add payment method error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    res.json({
      success: true,
      paymentMethods: merchant.paymentMethods || [],
    });
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getBillingHistory = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user.id);

    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    res.json({
      success: true,
      billingHistory: merchant.billingHistory || [],
    });
  } catch (error) {
    console.error("Get billing history error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
