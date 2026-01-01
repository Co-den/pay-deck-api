const axios = require('axios');
const crypto = require('crypto');
const { Webhook, WebhookLog } = require('../models/Webhook.model');

/**
 * Send webhook notification to merchant's endpoint
 */
exports.sendWebhook = async (merchantId, eventType, transaction) => {
  try {
    // Find active webhooks for this merchant that listen to this event
    const webhooks = await Webhook.find({
      merchant: merchantId,
      isActive: true,
      events: eventType
    });

    if (webhooks.length === 0) {
      console.log(`No active webhooks found for event: ${eventType}`);
      return;
    }

    // Send to all matching webhooks
    const promises = webhooks.map(webhook => 
      deliverWebhook(webhook, eventType, transaction)
    );

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error sending webhooks:', error);
  }
};

/**
 * Deliver webhook to a specific endpoint
 */
async function deliverWebhook(webhook, eventType, transaction) {
  const payload = buildPayload(eventType, transaction);
  
  // Create webhook log
  const webhookLog = await WebhookLog.create({
    webhook: webhook._id,
    transaction: transaction._id,
    event: eventType,
    payload,
    finalStatus: 'pending'
  });

  // Attempt delivery with retries
  const maxAttempts = webhook.retryPolicy.maxAttempts;
  let attemptNumber = 0;
  let success = false;

  while (attemptNumber < maxAttempts && !success) {
    attemptNumber++;
    
    try {
      const result = await attemptDelivery(webhook, payload, attemptNumber);
      
      // Log attempt
      webhookLog.attempts.push({
        attemptNumber,
        timestamp: new Date(),
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        success: result.success,
        errorMessage: result.errorMessage
      });

      if (result.success) {
        success = true;
        webhookLog.finalStatus = 'success';
        webhook.statistics.successfulDeliveries += 1;
      } else {
        // Wait before retry
        if (attemptNumber < maxAttempts) {
          await sleep(webhook.retryPolicy.retryDelaySeconds * 1000 * attemptNumber);
        }
      }
    } catch (error) {
      webhookLog.attempts.push({
        attemptNumber,
        timestamp: new Date(),
        success: false,
        errorMessage: error.message
      });
    }
  }

  if (!success) {
    webhookLog.finalStatus = 'failed';
    webhook.statistics.failedDeliveries += 1;
  }

  webhookLog.totalAttempts = attemptNumber;
  await webhookLog.save();

  // Update webhook statistics
  webhook.statistics.totalDeliveries += 1;
  webhook.statistics.lastDeliveryAt = new Date();
  webhook.statistics.lastDeliveryStatus = webhookLog.finalStatus;
  await webhook.save();

  return success;
}

/**
 * Attempt single webhook delivery
 */
async function attemptDelivery(webhook, payload, attemptNumber) {
  const startTime = Date.now();

  try {
    // Generate signature
    const signature = generateSignature(payload, webhook.secret);

    // Send webhook
    const response = await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-PayDeck-Signature': signature,
        'X-PayDeck-Event': payload.event,
        'X-PayDeck-Delivery-ID': payload.id,
        'X-PayDeck-Attempt': attemptNumber.toString()
      },
      timeout: 10000, // 10 second timeout
      validateStatus: (status) => status >= 200 && status < 300
    });

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      statusCode: response.status,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      statusCode: error.response?.status || 0,
      responseTime,
      errorMessage: error.message
    };
  }
}

/**
 * Build webhook payload
 */
function buildPayload(eventType, transaction) {
  const payload = {
    id: `evt_${crypto.randomBytes(12).toString('hex')}`,
    event: eventType,
    created: Date.now(),
    data: {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      customer: {
        email: transaction.customer.email,
        name: transaction.customer.name
      },
      paymentMethod: {
        type: transaction.paymentMethod.type,
        brand: transaction.paymentMethod.brand,
        last4: transaction.paymentMethod.last4
      },
      metadata: transaction.metadata,
      createdAt: transaction.createdAt
    }
  };

  // Add event-specific data
  if (eventType === 'refund.processed') {
    payload.data.refund = {
      amount: transaction.refund.refundedAmount,
      reason: transaction.refund.refundReason,
      date: transaction.refund.refundDate
    };
  }

  return payload;
}

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
exports.verifySignature = (payload, signature, secret) => {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Sleep helper for retries
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry failed webhooks (can be run as a background job)
 */
exports.retryFailedWebhooks = async () => {
  try {
    const failedLogs = await WebhookLog.find({
      finalStatus: 'failed',
      totalAttempts: { $lt: 3 },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).populate('webhook transaction');

    console.log(`Retrying ${failedLogs.length} failed webhooks`);

    for (const log of failedLogs) {
      if (log.webhook && log.webhook.isActive) {
        await deliverWebhook(log.webhook, log.event, log.transaction);
      }
    }
  } catch (error) {
    console.error('Error retrying failed webhooks:', error);
  }
};

module.exports = exports;
