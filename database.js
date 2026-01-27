const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'nexus.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // 1. Criar Tabelas (Em ordem)
        console.log("Criando tabelas...");

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image TEXT,
            stock INTEGER DEFAULT 0,
            category TEXT DEFAULT 'accessories'
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            total REAL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'processing',
            shipping_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // 2. Popular o Banco (Se estiver vazio)
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (!err && row.count === 0) {
                console.log('Banco vazio. Inserindo dados iniciais...');
                seedData();
            } else {
                console.log('Banco já populado.');
            }
        });
    });
}

function seedData() {
    const saltRounds = 10;
    const adminPassword = bcrypt.hashSync('admin123', saltRounds);

    // Criar Admin
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
        ['System Administrator', 'admin@nexus.com', adminPassword, 'admin']);

    // Criar Produtos
    const products = [
        {
            name: 'NVIDIA GeForce RTX 4090 Founders Edition',
            description: 'The ultimate graphics card for enthusiasts. Featuring 24GB GDDR6X memory.',
            price: 1599.99,
            image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80',
            stock: 8,
            category: 'graphics'
        },
        {
            name: 'Phantom Elite Mechanical Keyboard',
            description: 'Premium 65% mechanical keyboard with hot-swappable switches.',
            price: 349.99,
            image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80',
            stock: 24,
            category: 'keyboards'
        },
        {
            name: 'Apex Pro Wireless Gaming Mouse',
            description: 'Ultra-lightweight wireless gaming mouse at just 58g.',
            price: 179.99,
            image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
            stock: 42,
            category: 'mice'
        },
        {
            name: 'UltraView OLED 27" 240Hz Monitor',
            description: 'Professional-grade OLED gaming monitor with 2560x1440 resolution.',
            price: 999.99,
            image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80',
            stock: 12,
            category: 'monitors'
        },
        {
            name: 'Nova Pro Wireless Headset',
            description: 'Premium wireless gaming headset with active noise cancellation.',
            price: 279.99,
            image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80',
            stock: 35,
            category: 'audio'
        },
        {
            name: 'StreamDeck Pro Controller',
            description: 'Professional streaming controller with 15 customizable LCD keys.',
            price: 249.99,
            image: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=800&q=80',
            stock: 18,
            category: 'accessories'
        }
    ];

    products.forEach((p) => {
        db.run(`INSERT INTO products (name, description, price, image, stock, category) VALUES (?, ?, ?, ?, ?, ?)`, 
            [p.name, p.description, p.price, p.image, p.stock, p.category]);
    });
    
    console.log("Dados inseridos com sucesso!");
}

module.exports = db;
