# PayDeck Payment Gateway - Backend API

A comprehensive payment gateway backend built with Node.js, Express, and MongoDB.

## Features

- 🔐 **Secure Authentication** - JWT-based auth with bcrypt password hashing
- 💳 **Payment Processing** - Create charges, refunds, and cancellations
- 🔑 **API Key Management** - Generate and manage API keys with permissions
- 📊 **Analytics Dashboard** - Real-time transaction statistics and trends
- 🪝 **Webhooks** - Event-driven notifications with retry logic
- 💰 **Multi-currency Support** - Process payments in multiple currencies
- 🛡️ **Risk Management** - Built-in fraud detection and risk scoring
- 📈 **Transaction Management** - Query, filter, and export transactions
- 🏦 **Settlement System** - Automated payment settlements
- 🔒 **Security** - Rate limiting, CORS, Helmet, input validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, express-rate-limit
- **Validation**: express-validator
- **Logging**: Morgan

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd paydeck-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/paydeck
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
```

4. Start MongoDB:
```bash
# Using MongoDB service
sudo service mongod start

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5000`

## API Documentation

### Authentication

#### Register Merchant
```http
POST /api/auth/register
Content-Type: application/json

{
  "businessName": "My Business",
  "email": "merchant@example.com",
  "password": "SecurePass123",
  "businessType": "ecommerce",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "SecurePass123"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "merchant": {
      "id": "507f1f77bcf86cd799439011",
      "businessName": "My Business",
      "email": "merchant@example.com",
      "tier": "starter"
    }
  }
}
```

### API Keys

#### Create API Key
```http
POST /api/keys
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Production Key",
  "type": "live",
  "permissions": ["read", "write", "refund"]
}
```

Response includes the full API key (shown only once):
```json
{
  "status": "success",
  "data": {
    "key": "pk_live_abc123...",
    "apiKey": {
      "id": "...",
      "name": "Production Key",
      "keyPrefix": "pk_live_abc123"
    }
  }
}
```

### Payments

#### Create Payment
```http
POST /api/payments/charge
X-API-Key: pk_test_your_key_here
Content-Type: application/json

{
  "amount": 1500,
  "currency": "USD",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "paymentMethod": {
    "type": "card",
    "last4": "4242",
    "brand": "visa",
    "expiryMonth": 12,
    "expiryYear": 2025
  },
  "description": "Order #12345",
  "metadata": {
    "orderId": "12345",
    "customerId": "cust_123"
  }
}
```

Response:
```json
{
  "status": "success",
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "txn_abc123...",
    "status": "success",
    "amount": 1500,
    "currency": "USD",
    "fees": {
      "processingFee": 43.80,
      "platformFee": 7.50,
      "totalFee": 51.30
    }
  }
}
```

#### Refund Payment
```http
POST /api/payments/:transactionId/refund
X-API-Key: pk_test_your_key_here
Content-Type: application/json

{
  "amount": 1500,
  "reason": "Customer requested refund"
}
```

#### Get Payment
```http
GET /api/payments/:transactionId
X-API-Key: pk_test_your_key_here
```

### Transactions

#### Get All Transactions
```http
GET /api/transactions?status=success&page=1&limit=20
Authorization: Bearer <jwt-token>
```

Query parameters:
- `status`: Filter by status (pending, success, failed, etc.)
- `startDate`: Start date for date range filter
- `endDate`: End date for date range filter
- `minAmount`: Minimum transaction amount
- `maxAmount`: Maximum transaction amount
- `customerEmail`: Filter by customer email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

#### Get Transaction Analytics
```http
GET /api/transactions/analytics/summary?period=30d
Authorization: Bearer <jwt-token>
```

Periods: `7d`, `30d`, `90d`, `1y`

#### Export Transactions
```http
GET /api/transactions/export?format=csv&startDate=2024-01-01
Authorization: Bearer <jwt-token>
```

### Webhooks

#### Create Webhook
```http
POST /api/webhooks
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "url": "https://yourdomain.com/webhooks",
  "events": [
    "payment.success",
    "payment.failed",
    "refund.processed"
  ]
}
```

#### Test Webhook
```http
POST /api/webhooks/:id/test
Authorization: Bearer <jwt-token>
```

### Merchant Management

#### Get Merchant Profile
```http
GET /api/merchant/profile
Authorization: Bearer <jwt-token>
```

#### Update Merchant Settings
```http
PUT /api/merchant/settings
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "currency": "USD",
  "autoSettle": true,
  "settlementSchedule": "daily"
}
```

#### Get Dashboard Summary
```http
GET /api/merchant/dashboard
Authorization: Bearer <jwt-token>
```

## Webhook Events

PayDeck sends webhooks for the following events:

- `payment.created` - Payment initiated
- `payment.success` - Payment completed successfully
- `payment.failed` - Payment failed
- `payment.cancelled` - Payment cancelled
- `refund.created` - Refund initiated
- `refund.processed` - Refund completed
- `settlement.completed` - Settlement completed

### Webhook Payload Structure

```json
{
  "id": "evt_abc123...",
  "event": "payment.success",
  "created": 1640000000000,
  "data": {
    "transactionId": "txn_xyz789...",
    "amount": 1500,
    "currency": "USD",
    "status": "success",
    "customer": {
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "paymentMethod": {
      "type": "card",
      "brand": "visa",
      "last4": "4242"
    }
  }
}
```

### Verifying Webhooks

Verify webhook signatures using the `X-PayDeck-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Error Handling

All errors follow this structure:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Security Best Practices

1. **Never commit sensitive data** - Keep API keys and secrets in `.env` file
2. **Use HTTPS in production** - Never send API keys over HTTP
3. **Rotate API keys regularly** - Use the rotate endpoint
4. **Implement rate limiting** - Already configured, adjust as needed
5. **Validate all inputs** - Use express-validator
6. **Monitor suspicious activity** - Check risk scores and failed transactions
7. **Keep dependencies updated** - Run `npm audit` regularly

## Testing

### Test Card Numbers

Use these test card numbers in development:

- `4242 4242 4242 4242` - Success
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 0000` - Generic failure

Any future expiry date and any 3-digit CVV will work.

### Running Tests

```bash
npm test
```

## Project Structure

```
paydeck-backend/
├── controllers/        # Request handlers
├── models/            # Database models
├── routes/            # API routes
├── middleware/        # Custom middleware
├── utils/             # Helper functions
├── config/            # Configuration files
├── server.js          # Application entry point
├── package.json       # Dependencies
└── .env.example       # Environment variables template
```

## Performance

- Rate limiting: 100 requests per 15 minutes per IP
- Database indexing on frequently queried fields
- Webhook retry logic with exponential backoff
- Connection pooling for database

## Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start server.js --name paydeck-api
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t paydeck-backend .
docker run -p 5000:5000 --env-file .env paydeck-backend
```

## Monitoring

Recommended monitoring tools:
- **Application**: PM2, New Relic, or DataDog
- **Database**: MongoDB Atlas monitoring
- **Logs**: Winston, Loggly, or Papertrail
- **Uptime**: Pingdom, UptimeRobot

## Support

For issues or questions:
- Email: support@paydeck.com
- Documentation: https://docs.paydeck.com
- GitHub Issues: https://github.com/paydeck/backend/issues

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Built with ❤️ by the PayDeck Team
