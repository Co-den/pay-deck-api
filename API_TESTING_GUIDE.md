# PayDeck API Testing Guide

This guide provides sample API requests for testing PayDeck endpoints using curl, Postman, or any HTTP client.

## Base URL

```
http://localhost:5000/api
```

## 1. Authentication Flow

### Register a Merchant

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Tech Store Inc",
    "email": "merchant@techstore.com",
    "password": "SecurePass123",
    "businessType": "ecommerce",
    "phone": "+1234567890"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@techstore.com",
    "password": "SecurePass123"
  }'
```

**Save the JWT token from the response!**

### Get Current Merchant

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 2. API Key Management

**Note:** Test and Live API keys are automatically generated when you register a merchant account. You can use these keys immediately or create additional keys as needed.

### Create Test API Key

```bash
curl -X POST http://localhost:5000/api/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "type": "test",
    "permissions": ["read", "write", "refund"]
  }'
```

**Save the API key from the response!**

### List All API Keys

```bash
curl -X GET http://localhost:5000/api/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update API Key

```bash
curl -X PUT http://localhost:5000/api/keys/KEY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Key Name",
    "isActive": true
  }'
```

## 3. Payment Processing

### Create a Successful Payment

```bash
curl -X POST http://localhost:5000/api/payments/charge \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "USD",
    "customer": {
      "email": "customer@example.com",
      "name": "John Doe",
      "phone": "+1987654321"
    },
    "paymentMethod": {
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025
    },
    "description": "Order #12345 - MacBook Pro",
    "metadata": {
      "orderId": "12345",
      "customerId": "cust_123",
      "productSku": "MBP-16-2024"
    }
  }'
```

### Create a Failed Payment (use last4: "0002")

```bash
curl -X POST http://localhost:5000/api/payments/charge \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "currency": "USD",
    "customer": {
      "email": "failing@example.com",
      "name": "Test Fail"
    },
    "paymentMethod": {
      "type": "card",
      "last4": "0002",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025
    },
    "description": "Test failed payment"
  }'
```

### Get Payment Details

```bash
curl -X GET http://localhost:5000/api/payments/TRANSACTION_ID \
  -H "X-API-Key: YOUR_API_KEY"
```

### Refund a Payment

```bash
curl -X POST http://localhost:5000/api/payments/TRANSACTION_ID/refund \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "reason": "Customer requested refund - product not as described"
  }'
```

### Partial Refund

```bash
curl -X POST http://localhost:5000/api/payments/TRANSACTION_ID/refund \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Partial refund for damaged item"
  }'
```

### Cancel Pending Payment

```bash
curl -X POST http://localhost:5000/api/payments/TRANSACTION_ID/cancel \
  -H "X-API-Key: YOUR_API_KEY"
```

### Create Payment Link

```bash
curl -X POST http://localhost:5000/api/payments/links \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 9999,
    "currency": "USD",
    "description": "Premium subscription annual plan",
    "expiresIn": 72
  }'
```

## 4. Transaction Management

### Get All Transactions

```bash
curl -X GET "http://localhost:5000/api/transactions?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter Transactions by Status

```bash
curl -X GET "http://localhost:5000/api/transactions?status=success&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Date Range

```bash
curl -X GET "http://localhost:5000/api/transactions?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Amount Range

```bash
curl -X GET "http://localhost:5000/api/transactions?minAmount=1000&maxAmount=5000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search by Customer Email

```bash
curl -X GET "http://localhost:5000/api/transactions?customerEmail=customer@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Transaction Analytics

```bash
# Last 30 days
curl -X GET "http://localhost:5000/api/transactions/analytics/summary?period=30d" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Last 7 days
curl -X GET "http://localhost:5000/api/transactions/analytics/summary?period=7d" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Export Transactions (JSON)

```bash
curl -X GET "http://localhost:5000/api/transactions/export?format=json&startDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Export Transactions (CSV)

```bash
curl -X GET "http://localhost:5000/api/transactions/export?format=csv&status=success" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o transactions.csv
```

## 5. Webhook Management

### Create Webhook

```bash
curl -X POST http://localhost:5000/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/webhooks/paydeck",
    "events": [
      "payment.success",
      "payment.failed",
      "refund.processed"
    ]
  }'
```

**Save the webhook secret from the response!**

### List All Webhooks

```bash
curl -X GET http://localhost:5000/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Webhook

```bash
curl -X PUT http://localhost:5000/api/webhooks/WEBHOOK_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/webhooks/paydeck-v2",
    "events": ["payment.success", "refund.processed"],
    "isActive": true
  }'
```

### Test Webhook

```bash
curl -X POST http://localhost:5000/api/webhooks/WEBHOOK_ID/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Webhook Logs

```bash
curl -X GET "http://localhost:5000/api/webhooks/WEBHOOK_ID/logs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete Webhook

```bash
curl -X DELETE http://localhost:5000/api/webhooks/WEBHOOK_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 6. Merchant Management

### Get Merchant Profile

```bash
curl -X GET http://localhost:5000/api/merchant/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Profile

```bash
curl -X PUT http://localhost:5000/api/merchant/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Tech Store Inc (Updated)",
    "phone": "+1234567890",
    "website": "https://techstore.com",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "postalCode": "94102"
    }
  }'
```

### Update Settings

```bash
curl -X PUT http://localhost:5000/api/merchant/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "autoSettle": true,
    "settlementSchedule": "daily",
    "notificationEmail": "notifications@techstore.com"
  }'
```

### Update Bank Account

```bash
curl -X PUT http://localhost:5000/api/merchant/bank-account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Tech Store Inc",
    "accountNumber": "1234567890",
    "bankName": "Chase Bank",
    "routingNumber": "021000021"
  }'
```

### Get Dashboard Summary

```bash
curl -X GET http://localhost:5000/api/merchant/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Statistics

```bash
curl -X GET http://localhost:5000/api/merchant/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 7. Testing Scenarios

### Scenario 1: Complete Payment Flow

1. Register merchant
2. Login and get JWT
3. Create API key
4. Process payment
5. Check payment status
6. View in transactions list

### Scenario 2: Refund Flow

1. Create successful payment
2. Get transaction ID
3. Process full refund
4. Verify refund status

### Scenario 3: Webhook Integration

1. Create webhook endpoint (use webhook.site for testing)
2. Register webhook with PayDeck
3. Process payment
4. Verify webhook delivery
5. Check webhook logs

### Scenario 4: Analytics & Reporting

1. Process multiple payments
2. Get analytics summary
3. Filter transactions
4. Export to CSV

## 8. Environment Variables for Testing

Create a `.env` file:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/paydeck
JWT_SECRET=test-jwt-secret-key-change-in-production
JWT_EXPIRE=30d
ENCRYPTION_KEY=12345678901234567890123456789012
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
WEBHOOK_SECRET=test-webhook-secret
PAYMENT_PROVIDER=mock
FRONTEND_URL=http://localhost:3000
```

## 9. Postman Collection

Import this into Postman for easier testing:

1. Create new collection "PayDeck API"
2. Add environment with:
   - `base_url`: http://localhost:5000/api
   - `jwt_token`: (will be set after login)
   - `api_key`: (will be set after creating key)
   - `transaction_id`: (will be set after payment)

3. Add requests as shown above
4. Use {{variables}} for dynamic values

## 10. Common Issues & Solutions

### Issue: "Not authorized"
- **Solution**: Check JWT token is valid and included in Authorization header

### Issue: "API key is required"
- **Solution**: Include `X-API-Key` header with valid key

### Issue: "Merchant account is not active"
- **Solution**: Check account status in merchant profile

### Issue: "Transaction not found"
- **Solution**: Verify transaction ID and merchant ownership

### Issue: "Webhook delivery failed"
- **Solution**: Check webhook URL is accessible and returns 200 status

---

## Quick Start Script

```bash
#!/bin/bash

# 1. Register
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Store",
    "email": "test@example.com",
    "password": "TestPass123",
    "businessType": "ecommerce"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token')
echo "JWT Token: $TOKEN"

# 2. Create API Key
KEY_RESPONSE=$(curl -s -X POST http://localhost:5000/api/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "type": "test",
    "permissions": ["read", "write", "refund"]
  }')

API_KEY=$(echo $KEY_RESPONSE | jq -r '.data.key')
echo "API Key: $API_KEY"

# 3. Create Payment
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/payments/charge \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "USD",
    "customer": {
      "email": "customer@example.com",
      "name": "Test Customer"
    },
    "paymentMethod": {
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025
    }
  }')

TRANSACTION_ID=$(echo $PAYMENT_RESPONSE | jq -r '.data.transactionId')
echo "Transaction ID: $TRANSACTION_ID"
```

Make it executable: `chmod +x test-api.sh`

Run it: `./test-api.sh`
