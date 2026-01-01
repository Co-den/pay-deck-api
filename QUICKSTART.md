# PayDeck Backend - Quick Start Guide

Get your PayDeck payment gateway backend up and running in 5 minutes!

## Prerequisites

- **Node.js** (v14+): [Download](https://nodejs.org/)
- **MongoDB** (v4.4+): [Download](https://www.mongodb.com/try/download/community)

## Quick Installation

### Option 1: Local MongoDB

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start MongoDB (if not running)
# On Mac with Homebrew:
brew services start mongodb-community

# On Linux:
sudo service mongod start

# On Windows:
net start MongoDB

# 4. Start the server
npm run dev
```

### Option 2: MongoDB with Docker

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 3. Copy and edit environment file
cp .env.example .env

# 4. Start the server
npm run dev
```

### Option 3: MongoDB Atlas (Cloud)

```bash
# 1. Install dependencies
npm install

# 2. Create free cluster at https://www.mongodb.com/cloud/atlas

# 3. Copy environment file and update MONGODB_URI
cp .env.example .env
# Edit .env and set:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/paydeck

# 4. Start the server
npm run dev
```

## Verify Installation

Server should start on `http://localhost:5000`

### Test the health endpoint:

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "success",
  "message": "PayDeck API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## First API Calls

### 1. Register a Merchant

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Store",
    "email": "merchant@mystore.com",
    "password": "SecurePass123",
    "businessType": "ecommerce"
  }'
```

**Save both the JWT token AND the API keys from the response!**

Test and Live API keys are automatically generated during registration.

### 2. Use Your API Keys (Optional - Create Additional Keys)

You now have both Test and Live API keys. Use Test keys for development and Live keys for production.

If you want to create additional API keys, you can do so:

Replace `YOUR_JWT_TOKEN` with the token from step 1:

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

### 3. Process Your First Payment

Replace `YOUR_API_KEY` with the Test API key from registration for development, or create a Live key for production:

```bash
curl -X POST http://localhost:5000/api/payments/charge \
  -H "X-API-Key: YOUR_TEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "USD",
    "customer": {
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "paymentMethod": {
      "type": "card",
      "last4": "4242",

```bash
curl -X POST http://localhost:5000/api/payments/charge \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
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
    "description": "Test payment"
  }'
```

Success! 🎉 You've processed your first payment!

## Environment Variables

Minimum required variables in `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/paydeck
JWT_SECRET=your-super-secret-jwt-key-change-this
```

For production, also set:

```env
NODE_ENV=production
ENCRYPTION_KEY=your-32-character-encryption-key
FRONTEND_URL=https://yourdomain.com
```

## Test Card Numbers

Use these in development:

| Card Number | Result |
|-------------|--------|
| 4242 (last4) | ✅ Success |
| 0002 (last4) | ❌ Card declined |
| 0000 (last4) | ❌ Generic failure |

## Common Commands

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests (when available)
npm test

# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

## Project Structure

```
paydeck-backend/
├── controllers/        # Business logic
│   ├── auth.controller.js
│   ├── payment.controller.js
│   ├── transaction.controller.js
│   ├── apiKey.controller.js
│   └── webhook.controller.js
├── models/            # Database schemas
│   ├── Merchant.model.js
│   ├── Transaction.model.js
│   ├── ApiKey.model.js
│   └── Webhook.model.js
├── routes/            # API endpoints
│   ├── auth.routes.js
│   ├── payment.routes.js
│   ├── transaction.routes.js
│   ├── apiKey.routes.js
│   ├── webhook.routes.js
│   └── merchant.routes.js
├── middleware/        # Express middleware
│   ├── auth.js
│   └── errorHandler.js
├── utils/             # Helper functions
│   ├── paymentProcessor.js
│   └── webhookService.js
└── server.js          # Entry point
```

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register merchant |
| POST | `/api/auth/login` | Login merchant |
| GET | `/api/auth/me` | Get current merchant |
| POST | `/api/keys` | Create API key |
| GET | `/api/keys` | List API keys |
| POST | `/api/payments/charge` | Process payment |
| POST | `/api/payments/:id/refund` | Refund payment |
| GET | `/api/transactions` | List transactions |
| GET | `/api/transactions/analytics/summary` | Get analytics |
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks` | List webhooks |

See [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) for detailed examples.

## Troubleshooting

### Error: "Cannot connect to MongoDB"

**Solution:**
```bash
# Check if MongoDB is running
mongo --eval "db.version()"

# Or with Docker
docker ps | grep mongo

# Start MongoDB if not running
# Mac: brew services start mongodb-community
# Linux: sudo service mongod start
# Docker: docker start mongodb
```

### Error: "Port 5000 already in use"

**Solution:**
```bash
# Change PORT in .env file
PORT=5001

# Or kill the process using port 5000
# Mac/Linux:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Error: "JWT token expired"

**Solution:** Login again to get a new token

### Error: "API key authentication failed"

**Solution:** Verify API key is correct and active

## Next Steps

1. ✅ Read the [README.md](./README.md) for comprehensive documentation
2. ✅ Check [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) for detailed testing
3. ✅ Set up webhooks to receive real-time notifications
4. ✅ Integrate with your frontend application
5. ✅ Configure production environment variables
6. ✅ Set up monitoring and logging

## Production Checklist

Before going to production:

- [ ] Change all default secrets in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS for all API calls
- [ ] Enable rate limiting (already configured)
- [ ] Set up proper logging
- [ ] Configure MongoDB backups
- [ ] Set up monitoring (PM2, New Relic, etc.)
- [ ] Review and update CORS settings
- [ ] Test webhook delivery thoroughly
- [ ] Set up SSL certificates

## Getting Help

- 📖 **Documentation**: Check README.md
- 🧪 **Testing**: See API_TESTING_GUIDE.md
- 🐛 **Issues**: [GitHub Issues](https://github.com/paydeck/backend/issues)
- 💬 **Support**: support@paydeck.com

## Development Tips

```bash
# Watch logs in real-time
npm run dev | npx pino-pretty

# Check MongoDB data
mongo
> use paydeck
> db.merchants.find()
> db.transactions.find()

# Reset database (careful!)
mongo paydeck --eval "db.dropDatabase()"
```

---

Happy building! 🚀

For questions or issues, please check the documentation or open an issue on GitHub.
