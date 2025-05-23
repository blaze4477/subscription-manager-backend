# Subscription Manager - Backend API

A Node.js/Express.js backend API for managing subscription services with user authentication and analytics.

## 🚀 Features

- **User Authentication** - JWT-based auth with refresh tokens
- **Subscription Management** - CRUD operations for subscriptions
- **Transaction Tracking** - Payment history and analytics
- **Security** - CORS, Helmet, password hashing
- **Database** - Prisma ORM with SQLite

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT + bcryptjs
- **Security:** Helmet, CORS
- **Logging:** Morgan

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd subscription-manager-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Subscriptions
- `GET /api/subscriptions` - Get user subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/:id` - Get subscription by ID
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription
- `GET /api/subscriptions/analytics` - Get analytics data

### Health
- `GET /health` - Health check endpoint

## 🗃️ Database Schema

### User
- `id` - Unique identifier
- `email` - User email (unique)
- `password` - Hashed password
- `name` - User display name
- `createdAt` - Registration date
- `updatedAt` - Last update

### Subscription
- `id` - Unique identifier
- `userId` - Foreign key to User
- `serviceName` - Service name (Netflix, Spotify, etc.)
- `planType` - Subscription plan
- `cost` - Monthly/yearly cost
- `billingCycle` - Billing frequency
- `nextBillingDate` - Next payment date
- `status` - active/inactive/cancelled
- `category` - Service category
- `paymentMethod` - Payment method
- `autoRenewal` - Auto-renewal status

### Transaction
- `id` - Unique identifier
- `subscriptionId` - Foreign key to Subscription
- `amount` - Transaction amount
- `date` - Transaction date
- `paymentMethod` - Payment method used
- `status` - completed/pending/failed
- `receiptUrl` - Receipt URL (optional)

## 🔒 Security Features

- **Password Hashing** - bcryptjs with salt rounds
- **JWT Authentication** - Secure token-based auth
- **CORS Protection** - Configurable cross-origin requests
- **Security Headers** - Helmet.js security middleware
- **Input Validation** - Request validation and sanitization

## 🚀 Deployment

### Environment Variables
```env
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=https://yourdomain.com
DATABASE_URL=postgresql://username:password@host:port/database
```

### Production Setup
1. Set up production database
2. Configure environment variables
3. Run database migrations
4. Start the server

## 🧪 Development

### Database Management
```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name migration-name
```

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data

## 📝 API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Get Subscriptions
```bash
curl -X GET http://localhost:3001/api/subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.