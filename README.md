# NEXUS HARDWARE

Premium gaming equipment e-commerce platform.

## Installation

```bash
# Install dependencies
npm install

# Initialize database
npm run init-db

# Start server
npm start
```

Access the application at: **http://localhost:3000**

## Features

- User registration and authentication
- Product catalog with category filtering
- Order management
- Admin dashboard for product and order management

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** SQLite3
- **Frontend:** Vanilla JavaScript, CSS3
- **Authentication:** bcrypt

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/logout` - User logout
- `GET /api/session/:sessionId` - Verify session

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/admin/products` - Add product (admin only)
- `PUT /api/admin/products/:id` - Update product (admin only)
- `DELETE /api/admin/products/:id` - Delete product (admin only)

### Orders
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/orders` - List all orders
- `GET /api/admin/stats` - Dashboard statistics

---

© 2024 Nexus Hardware. All rights reserved.
