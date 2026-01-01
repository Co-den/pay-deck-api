# PayDeck Payment Gateway Backend - Complete Overview

## 🎯 What You've Got

A production-ready payment gateway backend with enterprise-level features including:

- ✅ **Secure Authentication** - JWT + bcrypt password hashing
- ✅ **Payment Processing** - Full charge, refund, and cancellation flow
- ✅ **API Key System** - Granular permissions (read/write/refund)
- ✅ **Real-time Webhooks** - Event notifications with retry logic
- ✅ **Transaction Analytics** - Dashboard with statistics and trends
- ✅ **Risk Management** - Fraud detection and risk scoring
- ✅ **Multi-currency** - Process payments in different currencies
- ✅ **Export Functionality** - CSV/JSON transaction exports
- ✅ **Rate Limiting** - Built-in DDoS protection
- ✅ **Comprehensive Logging** - Morgan for HTTP request logging

## 📂 Project Structure

```
paydeck-backend/
├── 📄 server.js                 # Main application entry point
├── 📄 package.json              # Dependencies and scripts
├── 📄 .env.example              # Environment variables template
├── 📄 README.md                 # Complete documentation
├── 📄 QUICKSTART.md             # 5-minute setup guide
├── 📄 API_TESTING_GUIDE.md      # API testing examples
│
├── 📁 controllers/              # Business logic layer
│   ├── auth.controller.js       # Authentication (register, login, etc.)
│   ├── payment.controller.js    # Payment processing (charge, refund)
│   ├── transaction.controller.js # Transaction queries and analytics
│   ├── apiKey.controller.js     # API key CRUD operations
│   ├── webhook.controller.js    # Webhook management
│
├── 📁 models/                   # MongoDB schemas
│   ├── Merchant.model.js        # Merchant/business accounts
│   ├── Transaction.model.js     # Payment transactions
│   ├── ApiKey.model.js          # API authentication keys
│   ├── Webhook.model.js         # Webhook configurations + logs
│
├── 📁 routes/                   # API endpoints
│   ├── auth.routes.js           # /api/auth/*
│   ├── payment.routes.js        # /api/payments/*
│   ├── transaction.routes.js    # /api/transactions/*
│   ├── apiKey.routes.js         # /api/keys/*
│   ├── webhook.routes.js        # /api/webhooks/*
│   ├── merchant.routes.js       # /api/merchant/*
│
├── 📁 middleware/               # Express middleware
│   ├── auth.js                  # JWT & API key authentication
│   ├── errorHandler.js          # Centralized error handling
│
└── 📁 utils/                    # Helper functions
    ├── paymentProcessor.js      # Payment processing logic
    ├── webhookService.js        # Webhook delivery system
```

## 🚀 Quick Start (3 Steps)

### 1. Install & Configure

```bash
cd paydeck-backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/paydeck
JWT_SECRET=your-secret-key-here
```

### 2. Start MongoDB

```bash
# Option A: Local
brew services start mongodb-community  # Mac
sudo service mongod start             # Linux

# Option B: Docker
docker run -d -p 27017:27017 mongo
```

### 3. Run Server

```bash
npm run dev
```

Server runs at `http://localhost:5000` ✅

## 🔑 Authentication System

### Two Authentication Methods:

1. **JWT Tokens** - For merchant dashboard/portal
   - Used in: `/api/auth/*`, `/api/merchant/*`, `/api/transactions/*`, `/api/keys/*`, `/api/webhooks/*`
   - Header: `Authorization: Bearer <token>`

2. **API Keys** - For payment processing
   - Used in: `/api/payments/*`
   - Header: `X-API-Key: <key>`

### Why Two Systems?

- **JWT**: Merchants log into their dashboard with username/password
- **API Keys**: Integrations authenticate with secure keys (no passwords exposed)

## 💳 Payment Flow

### Complete Payment Lifecycle:

```
1. Merchant registers → Gets JWT token + Test & Live API keys
2. (Optional) Merchant creates additional API keys → Gets pk_test_xxx or pk_live_xxx
3. Customer makes purchase → Frontend calls your backend
4. Your backend → Calls PayDeck /api/payments/charge with API key
5. PayDeck processes → Returns success/failure
6. PayDeck sends webhook → Notifies your server
7. Your server → Updates order status
```

### Example Payment Request:

```bash
POST /api/payments/charge
X-API-Key: pk_test_abc123...

{
  "amount": 2500,              # $25.00 in cents
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
  "description": "Order #12345"
}
```

## 📊 Key Features Explained

### 1. Transaction Management

**Query transactions with advanced filters:**
```
GET /api/transactions?status=success&startDate=2024-01-01&minAmount=1000&page=1
```

**Get analytics:**
```
GET /api/transactions/analytics/summary?period=30d
```

Returns:
- Total revenue
- Success/failure rates
- Average transaction amount
- Daily trends
- Payment method breakdown

### 2. Webhook System

**How it works:**
1. Merchant registers webhook URL
2. When event occurs (payment success/fail), PayDeck sends HTTP POST
3. Webhook includes HMAC signature for security
4. Automatic retries on failure (3 attempts)

**Verify webhook signature:**
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### 3. Refund System

**Full refund:**
```bash
POST /api/payments/txn_abc123/refund
{
  "amount": 2500,
  "reason": "Customer requested"
}
```

**Partial refund:**
```bash
POST /api/payments/txn_abc123/refund
{
  "amount": 500,
  "reason": "Damaged item"
}
```

### 4. API Key Permissions

Three permission levels:
- `read` - View transactions only
- `write` - Create payments
- `refund` - Process refunds

**Security features:**
- Keys are hashed (never stored in plain text)
- IP whitelisting support
- Usage tracking
- Expiration dates
- Easy rotation

## 🗄️ Database Schema

### Merchants Collection

```javascript
{
  businessName: "Tech Store Inc",
  email: "merchant@techstore.com",
  password: "<hashed>",
  tier: "starter" | "business" | "enterprise",
  accountStatus: "active" | "pending" | "suspended",
  statistics: {
    totalTransactions: 150,
    totalRevenue: 45000,
    successfulTransactions: 142,
    failedTransactions: 8
  },
  settings: {
    currency: "USD",
    autoSettle: true,
    webhookUrl: "https://..."
  }
}
```

### Transactions Collection

```javascript
{
  transactionId: "txn_abc123...",
  merchant: ObjectId("..."),
  customer: {
    email: "customer@example.com",
    name: "John Doe",
    ipAddress: "192.168.1.1"
  },
  amount: 2500,
  currency: "USD",
  status: "success" | "failed" | "refunded",
  paymentMethod: {
    type: "card",
    last4: "4242",
    brand: "visa"
  },
  fees: {
    processingFee: 72.80,
    platformFee: 12.50,
    totalFee: 85.30
  },
  riskScore: 15,
  createdAt: ISODate("...")
}
```

## 🔒 Security Features

### Built-in Protection:

1. **Password Security**
   - Bcrypt hashing (10 salt rounds)
   - Minimum 8 characters
   - Must include uppercase, lowercase, number

2. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Prevents brute force attacks

3. **CORS Protection**
   - Whitelist allowed origins
   - Credential support

4. **Helmet.js**
   - Sets security HTTP headers
   - XSS protection
   - Prevents clickjacking

5. **Input Validation**
   - express-validator for all inputs
   - SQL injection prevention
   - XSS filtering

6. **API Key Security**
   - SHA-256 hashing
   - Never stored in plain text
   - Prefix-based identification

## 📈 Fee Structure

Default fees (configurable):
- **Processing fee**: 2.9% + $0.30 per transaction
- **Platform fee**: 0.5% per transaction

Example for $100 transaction:
- Processing: ($100 × 0.029) + $0.30 = $3.20
- Platform: $100 × 0.005 = $0.50
- **Total fees**: $3.70
- **Merchant receives**: $96.30

## 🧪 Testing

### Test Card Numbers:

| Last 4 Digits | Result |
|---------------|--------|
| 4242 | ✅ Success |
| 0002 | ❌ Card declined |
| 0000 | ❌ Generic failure |

### Test Environment:

```env
NODE_ENV=development
PAYMENT_PROVIDER=mock
```

Uses mock payment processor (no real charges).

### Production Environment:

```env
NODE_ENV=production
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
```

Integrates with real payment processor.

## 🔧 Configuration Options

### Merchant Tiers:

- **Starter**: $0/month, 2.9% + $0.30 per transaction
- **Business**: $50/month, 2.5% + $0.30 per transaction
- **Enterprise**: Custom pricing

### Settlement Schedules:

- **Daily**: Funds settled every day
- **Weekly**: Funds settled every Monday
- **Monthly**: Funds settled on 1st of month

### Webhook Events:

- `payment.created` - Payment initiated
- `payment.success` - Payment completed
- `payment.failed` - Payment declined
- `payment.cancelled` - Payment cancelled
- `refund.created` - Refund initiated
- `refund.processed` - Refund completed
- `settlement.completed` - Funds settled

## 🎨 Customization

### Add New Payment Method:

1. Update `paymentMethod.type` enum in Transaction model
2. Add processor logic in `utils/paymentProcessor.js`
3. Update controller validation

### Add New Webhook Event:

1. Add event to `events` enum in Webhook model
2. Trigger in appropriate controller
3. Update webhook payload builder

### Change Fee Structure:

Edit `transactionSchema.pre('save')` in Transaction model:
```javascript
this.fees.processingFee = (this.amount * 0.029) + 0.30;
this.fees.platformFee = this.amount * 0.005;
```

## 📦 Deployment

### Option 1: Traditional Server

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name paydeck-api

# Save configuration
pm2 save

# Auto-restart on server reboot
pm2 startup
```

### Option 2: Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

```bash
docker build -t paydeck-backend .
docker run -d -p 5000:5000 --env-file .env paydeck-backend
```

### Option 3: Cloud Platforms

- **Heroku**: `git push heroku main`
- **AWS Elastic Beanstalk**: `eb deploy`
- **Google Cloud Run**: `gcloud run deploy`
- **DigitalOcean App Platform**: Connect GitHub repo

## 🎯 Production Checklist

Before going live:

- [ ] Change all default secrets in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas or managed database
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure real payment processor
- [ ] Set up monitoring (New Relic, DataDog)
- [ ] Enable database backups
- [ ] Test webhook delivery thoroughly
- [ ] Set up error logging (Sentry, Rollbar)
- [ ] Review and update CORS settings
- [ ] Set up rate limiting per merchant
- [ ] Configure email notifications
- [ ] Test refund flow end-to-end

## 📚 API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Health check |
| `/api/auth/register` | POST | None | Register merchant |
| `/api/auth/login` | POST | None | Login merchant |
| `/api/auth/me` | GET | JWT | Get current merchant |
| `/api/keys` | POST | JWT | Create API key |
| `/api/keys` | GET | JWT | List API keys |
| `/api/payments/charge` | POST | API Key | Process payment |
| `/api/payments/:id/refund` | POST | API Key | Refund payment |
| `/api/transactions` | GET | JWT | List transactions |
| `/api/transactions/analytics/summary` | GET | JWT | Get analytics |
| `/api/webhooks` | POST | JWT | Create webhook |
| `/api/merchant/dashboard` | GET | JWT | Dashboard data |

## 🤝 Integration Examples

### Node.js/Express Integration:

```javascript
const axios = require('axios');

async function processPayment(order) {
  const response = await axios.post(
    'http://localhost:5000/api/payments/charge',
    {
      amount: order.total * 100, // Convert to cents
      currency: 'USD',
      customer: {
        email: order.customerEmail,
        name: order.customerName
      },
      paymentMethod: order.paymentMethod,
      description: `Order #${order.id}`,
      metadata: { orderId: order.id }
    },
    {
      headers: {
        'X-API-Key': process.env.PAYDECK_API_KEY
      }
    }
  );
  
  return response.data;
}
```

### Webhook Handler:

```javascript
app.post('/webhooks/paydeck', (req, res) => {
  const signature = req.headers['x-paydeck-signature'];
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process event
  const { event, data } = req.body;
  
  switch (event) {
    case 'payment.success':
      // Update order status
      break;
    case 'payment.failed':
      // Handle failed payment
      break;
    case 'refund.processed':
      // Update refund status
      break;
  }
  
  res.status(200).send('OK');
});
```

## 🐛 Common Issues & Solutions

**Issue**: MongoDB connection failed
```bash
# Solution: Check MongoDB is running
mongo --eval "db.version()"
```

**Issue**: JWT token expired
```bash
# Solution: Login again to get new token
curl -X POST http://localhost:5000/api/auth/login ...
```

**Issue**: API key authentication failed
```bash
# Solution: Check key is active
curl -X GET http://localhost:5000/api/keys \
  -H "Authorization: Bearer JWT_TOKEN"
```

## 📞 Support & Resources

- 📖 **Full Documentation**: [README.md](./README.md)
- 🧪 **Testing Guide**: [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)
- 🚀 **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- 🐛 **Report Issues**: GitHub Issues
- 💬 **Get Help**: support@paydeck.com

## 🎉 What's Next?

1. ✅ **Test the API** - Use Postman or curl
2. ✅ **Build Frontend** - Connect to your UI
3. ✅ **Set up Webhooks** - Receive real-time notifications
4. ✅ **Go Production** - Deploy to your server
5. ✅ **Scale Up** - Add features as needed

---

**Built with ❤️ by the PayDeck Team**

This is a complete, production-ready payment gateway backend. All core features are implemented and ready to use. Customize as needed for your specific requirements!
