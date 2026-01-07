const stripe = require("stripe")(process.env.STRIPE_SECRET);
const PaymentLink = require("../models/PaymentLinkModel");
const Transaction = require("../models/Transaction.model");


exports.createPaymentIntent = async (req, res, next) => {
  try {
    const {
      amount,
      currency,
      customerData,
      paymentLinkId,
      shortCode,
      metadata,
    } = req.body;

    // Validate required fields
    if (!amount || !currency || !customerData) {
      return res.status(400).json({
        status: "error",
        message: "Amount, currency, and customer data are required",
      });
    }

    // If shortCode provided, get payment link
    let paymentLink = null;
    if (shortCode) {
      paymentLink = await PaymentLink.findOne({ shortCode });

      if (!paymentLink) {
        return res.status(404).json({
          status: "error",
          message: "Payment link not found",
        });
      }

      // Validate payment link
      const validation = paymentLink.isValid();
      if (!validation.valid) {
        return res.status(400).json({
          status: "error",
          message: validation.reason,
        });
      }
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone || "",
        paymentLinkId: paymentLinkId || "",
        shortCode: shortCode || "",
        ...(metadata || {}),
      },
      receipt_email: customerData.email,
      description: metadata?.title || "Payment via PayDeck",
    });

    res.status(200).json({
      status: "success",
      data: {
        paymentIntent: {
          clientSecret: paymentIntent.client_secret,
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        },
      },
    });
  } catch (error) {
    console.error("Payment Intent creation error:", error);
    next(error);
  }
};

// @desc    Confirm Payment
// @route   POST /api/payments/confirm
// @access  Public
exports.confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId, paymentLinkId, shortCode, customerData } =
      req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        status: "error",
        message: "Payment intent ID is required",
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        status: "error",
        message: "Payment not completed",
        data: {
          success: false,
          error: "Payment was not successful",
        },
      });
    }

    // Get payment link if shortCode provided
    let paymentLink = null;
    if (shortCode) {
      paymentLink = await PaymentLink.findOne({ shortCode });

      if (paymentLink) {
        // Record payment in payment link stats
        await paymentLink.recordPayment(paymentIntent.amount / 100, true);
      }
    }

    // Create transaction record
    if (paymentLink) {
      await Transaction.create({
        merchant: paymentLink.merchant,
        paymentLink: paymentLink._id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: "completed",
        paymentMethod: "card",
        provider: "stripe",
        transactionId: paymentIntent.id,
        customerEmail: customerData?.email || paymentIntent.receipt_email,
        customerName: customerData?.name || paymentIntent.metadata.customerName,
        customerPhone:
          customerData?.phone || paymentIntent.metadata.customerPhone,
        metadata: paymentIntent.metadata,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Payment confirmed successfully",
      data: {
        success: true,
        transactionId: paymentIntent.id,
        message: "Payment completed successfully",
      },
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    next(error);
  }
};

// @desc    Webhook handler for Stripe events
// @route   POST /api/payments/webhook
// @access  Public (Stripe webhook)
exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      console.log("PaymentIntent succeeded:", paymentIntent.id);

      // Update transaction status if needed
      // Record in analytics
      break;

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;
      console.log("Payment failed:", failedPayment.id);

      // Update payment link stats for failed payment
      if (failedPayment.metadata.shortCode) {
        const paymentLink = await PaymentLink.findOne({
          shortCode: failedPayment.metadata.shortCode,
        });

        if (paymentLink) {
          paymentLink.stats.failedPayments += 1;
          await paymentLink.save();
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

module.exports = exports;
