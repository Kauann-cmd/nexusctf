const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'nexus.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users Table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('Error creating users table:', err.message);
            });

            // Products Table
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price REAL NOT NULL,
                    image TEXT,
                    stock INTEGER DEFAULT 0,
                    category TEXT DEFAULT 'accessories'
                )
            `, (err) => {
                if (err) console.error('Error creating products table:', err.message);
            });

            // Orders Table
            db.run(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    product_name TEXT NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    total REAL,
                    date TEXT DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'processing',
                    shipping_address TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) console.error('Error creating orders table:', err.message);
            });

            // Cart Table
            db.run(`
                CREATE TABLE IF NOT EXISTS cart (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            `, (err) => {
                if (err) console.error('Error creating cart table:', err.message);
            });

            console.log('Database tables created successfully');
            resolve();
        });
    });
}

async function seedDatabase() {
    const saltRounds = 10;

    db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (err) {
            console.error('Error checking users:', err.message);
            return;
        }

        if (row.count === 0) {
            console.log('Seeding initial data...');

            // Create Admin Account Only
            const adminPassword = await bcrypt.hash('admin123', saltRounds);

            db.run(`
                INSERT INTO users (name, email, password, role) 
                VALUES (?, ?, ?, ?)
            `, ['System Administrator', 'admin@nexus.com', adminPassword, 'admin'], (err) => {
                if (err) console.error('Error creating admin:', err.message);
                else console.log('Admin account created');
            });

            // Insert Premium Products
            const products = [
                {
                    name: 'NVIDIA GeForce RTX 4090 Founders Edition',
                    description: 'The ultimate graphics card for enthusiasts. Featuring 24GB GDDR6X memory, 4th gen Tensor Cores, and DLSS 3.0 technology. Designed for 4K gaming at maximum settings with exceptional ray tracing performance.',
                    price: 1599.99,
                    image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80',
                    stock: 8,
                    category: 'graphics'
                },
                {
                    name: 'Phantom Elite Mechanical Keyboard',
                    description: 'Premium 65% mechanical keyboard with hot-swappable switches, aircraft-grade aluminum frame, and per-key RGB lighting. Features PBT double-shot keycaps and USB-C connectivity with detachable cable.',
                    price: 349.99,
                    image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80',
                    stock: 24,
                    category: 'keyboards'
                },
                {
                    name: 'Apex Pro Wireless Gaming Mouse',
                    description: 'Ultra-lightweight wireless gaming mouse at just 58g. Features a 30K DPI optical sensor, 100-hour battery life, and sub-millisecond wireless latency. Precision engineered for competitive gaming.',
                    price: 179.99,
                    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
                    stock: 42,
                    category: 'mice'
                },
                {
                    name: 'UltraView OLED 27" 240Hz Monitor',
                    description: 'Professional-grade OLED gaming monitor with 2560x1440 resolution and 240Hz refresh rate. Features 0.03ms response time, true blacks, and 1,500,000:1 contrast ratio. DisplayHDR 400 certified.',
                    price: 999.99,
                    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80',
                    stock: 12,
                    category: 'monitors'
                },
                {
                    name: 'Nova Pro Wireless Headset',
                    description: 'Premium wireless gaming headset with active noise cancellation, hi-res certified drivers, and 38-hour battery life. Features spatial audio, retractable microphone, and multi-platform connectivity.',
                    price: 279.99,
                    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80',
                    stock: 35,
                    category: 'audio'
                },
                {
                    name: 'StreamDeck Pro Controller',
                    description: 'Professional streaming controller with 15 customizable LCD keys, adjustable stand, and seamless software integration. Perfect for content creators, streamers, and productivity enthusiasts.',
                    price: 249.99,
                    image: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=800&q=80',
                    stock: 18,
                    category: 'accessories'
                }
            ];

            products.forEach((product) => {
                db.run(`
                    INSERT INTO products (name, description, price, image, stock, category) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [product.name, product.description, product.price, product.image, product.stock, product.category], (err) => {
                    if (err) console.error(`Error inserting product:`, err.message);
                });
            });

            console.log('Database seeding completed');
        } else {
            console.log('Database already contains data, skipping seed');
        }
    });
}

async function main() {
    await initializeDatabase();
    setTimeout(seedDatabase, 500);
}

main();

module.exports = db;
