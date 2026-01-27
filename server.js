const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080; 

const db = new sqlite3.Database(path.join(__dirname, 'nexus.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session storage
let sessions = {};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// LOGIN - SQL INJECTION VULNERABILITY
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please provide email and password' 
        });
    }

    // VULNERABLE: Direct string concatenation in SQL query
    const query = "SELECT * FROM users WHERE email = '" + email + "'";

    db.get(query, async (err, user) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'An error occurred' 
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword && !email.includes("'")) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessions[sessionId] = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        res.json({
            success: true,
            message: 'Login successful',
            sessionId: sessionId,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});

// REGISTER
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'All fields are required' 
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 6 characters' 
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please enter a valid email address' 
        });
    }

    try {
        const existingUser = await new Promise((resolve, reject) => {
            db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'An account with this email already exists' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(`
            INSERT INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)
        `, [name, email, hashedPassword, 'user'], function(err) {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Registration failed' 
                });
            }

            const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            sessions[sessionId] = {
                userId: this.lastID,
                email: email,
                name: name,
                role: 'user'
            };

            res.json({
                success: true,
                message: 'Account created successfully',
                sessionId: sessionId,
                user: {
                    id: this.lastID,
                    name: name,
                    email: email,
                    role: 'user'
                }
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed' 
        });
    }
});

// LOGOUT
app.post('/api/logout', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }
    res.json({ success: true, message: 'Logged out successfully' });
});

// SESSION CHECK
app.get('/api/session/:sessionId', (req, res) => {
    const session = sessions[req.params.sessionId];
    if (session) {
        res.json({ success: true, user: session });
    } else {
        res.status(401).json({ success: false, message: 'Session expired' });
    }
});

// ============================================
// PRODUCT ROUTES
// ============================================

app.get('/api/products', (req, res) => {
    const { category } = req.query;
    let query = "SELECT * FROM products";
    let params = [];

    if (category && category !== 'all') {
        query += " WHERE category = ?";
        params.push(category);
    }

    db.all(query, params, (err, products) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to load products' 
            });
        }
        res.json({ success: true, products });
    });
});

app.get('/api/products/:id', (req, res) => {
    db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, product) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to load product' 
            });
        }
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        res.json({ success: true, product });
    });
});

// ADMIN: ADD PRODUCT - XSS VULNERABILITY (no sanitization)
app.post('/api/admin/products', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session || session.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
        });
    }

    const { name, description, price, image, stock, category } = req.body;

    if (!name || !price) {
        return res.status(400).json({ 
            success: false, 
            message: 'Name and price are required' 
        });
    }

    // VULNERABLE: Description is stored without sanitization
    db.run(`
        INSERT INTO products (name, description, price, image, stock, category) 
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        name, 
        description, 
        price, 
        image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        stock || 0,
        category || 'accessories'
    ], function(err) {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to add product' 
            });
        }

        res.json({
            success: true,
            message: 'Product added successfully',
            productId: this.lastID
        });
    });
});

// ADMIN: UPDATE PRODUCT
app.put('/api/admin/products/:id', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session || session.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
        });
    }

    const { name, description, price, image, stock, category } = req.body;

    db.run(`
        UPDATE products 
        SET name = ?, description = ?, price = ?, image = ?, stock = ?, category = ?
        WHERE id = ?
    `, [name, description, price, image, stock, category, req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update product' 
            });
        }
        res.json({ success: true, message: 'Product updated' });
    });
});

// ADMIN: DELETE PRODUCT
app.delete('/api/admin/products/:id', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session || session.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
        });
    }

    db.run("DELETE FROM products WHERE id = ?", [req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to delete product' 
            });
        }
        res.json({ success: true, message: 'Product deleted' });
    });
});

// ============================================
// ORDER ROUTES - IDOR VULNERABILITY
// ============================================

// GET ORDER BY ID - IDOR VULNERABILITY
app.get('/api/orders/:id', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session) {
        return res.status(401).json({ 
            success: false, 
            message: 'Please login to view orders' 
        });
    }

    // VULNERABLE: Does not verify if order belongs to the logged-in user
    db.get("SELECT * FROM orders WHERE id = ?", [req.params.id], (err, order) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to load order' 
            });
        }
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        res.json({ success: true, order });
    });
});

// GET USER ORDERS
app.get('/api/orders', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session) {
        return res.status(401).json({ 
            success: false, 
            message: 'Please login to view orders' 
        });
    }

    db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC", [session.userId], (err, orders) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to load orders' 
            });
        }
        res.json({ success: true, orders });
    });
});

// CREATE ORDER
app.post('/api/orders', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session) {
        return res.status(401).json({ 
            success: false, 
            message: 'Please login to place an order' 
        });
    }

    const { productId, quantity, shippingAddress } = req.body;

    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        if (product.stock < (quantity || 1)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient stock' 
            });
        }

        const total = product.price * (quantity || 1);

        db.run(`
            INSERT INTO orders (user_id, product_name, quantity, total, status, shipping_address) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [session.userId, product.name, quantity || 1, total, 'processing', shippingAddress || ''], function(err) {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to create order' 
                });
            }

            // Update stock
            db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity || 1, productId]);

            res.json({
                success: true,
                message: 'Order placed successfully',
                orderId: this.lastID
            });
        });
    });
});

// ============================================
// ADMIN ROUTES
// ============================================

app.get('/api/admin/users', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session || session.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
        });
    }

    db.all("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC", (err, users) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to load users' 
            });
        }
        res.json({ success: true, users });
    });
});

app.get('/api/admin/orders', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session || session.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
        });
    }

    db.all(`
        SELECT orders.*, users.name as user_name, users.email as user_email 
        FROM orders 
        LEFT JOIN users ON orders.user_id = users.id 
        ORDER BY orders.date DESC
    `, (err, orders) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to load orders' 
            });
        }
        res.json({ success: true, orders });
    });
});

app.put('/api/admin/orders/:id/status', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session || session.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
        });
    }

    const { status } = req.body;

    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update order' 
            });
        }
        res.json({ success: true, message: 'Order status updated' });
    });
});

// ADMIN STATS
app.get('/api/admin/stats', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions[sessionId];

    if (!session || session.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
        });
    }

    const stats = {};

    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        stats.totalUsers = row?.count || 0;
        
        db.get("SELECT COUNT(*) as count FROM orders", (err, row) => {
            stats.totalOrders = row?.count || 0;
            
            db.get("SELECT SUM(total) as sum FROM orders", (err, row) => {
                stats.totalRevenue = row?.sum || 0;
                
                db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
                    stats.totalProducts = row?.count || 0;
                    res.json({ success: true, stats });
                });
            });
        });
    });
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
