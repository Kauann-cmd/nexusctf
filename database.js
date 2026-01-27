const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Caminho do arquivo
const DB_PATH = path.join(__dirname, 'nexus.db');

// 1. LIMPEZA TOTAL: Se o arquivo já existe, DELETA ele.
// Isso garante que o banco sempre nasça limpo e sem erros.
try {
    if (fs.existsSync(DB_PATH)) {
        console.log('--- Apagando banco de dados antigo para evitar conflitos ---');
        fs.unlinkSync(DB_PATH);
    }
} catch (err) {
    console.error("Aviso: Não foi possível apagar o banco antigo (talvez seja o primeiro uso).");
}

// 2. Cria conexão com arquivo novo
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('ERRO FATAL ao conectar no SQLite:', err.message);
    } else {
        console.log('>>> Novo banco de dados SQLite criado com sucesso.');
        iniciarTabelas();
    }
});

function iniciarTabelas() {
    // db.serialize garante que os comandos rodem UM POR UM na ordem certa
    db.serialize(() => {
        
        // --- CRIAR TABELA USERS ---
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT DEFAULT 'user',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // --- CRIAR TABELA PRODUCTS ---
        db.run(`
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                price REAL,
                image TEXT,
                stock INTEGER,
                category TEXT
            )
        `);

        // --- CRIAR TABELA ORDERS ---
        db.run(`
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                total REAL,
                status TEXT DEFAULT 'completed',
                date TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log(">>> Tabelas criadas.");

        // --- INSERIR DADOS (SEED) ---
        
        // 1. Criar Admin
        const salt = bcrypt.genSaltSync(10);
        const hashAdmin = bcrypt.hashSync('admin123', salt);
        
        const stmtUser = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)");
        stmtUser.run("Administrador", "admin@nexus.com", hashAdmin, "admin");
        stmtUser.finalize();

        // 2. Criar Produtos
        const stmtProd = db.prepare("INSERT INTO products (name, description, price, image, stock, category) VALUES (?,?,?,?,?,?)");
        
        stmtProd.run(
            "RTX 4090 Founders Edition", 
            "A placa de vídeo mais potente do mundo. 24GB GDDR6X.", 
            15999.00, 
            "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80", 
            5, 
            "gpu"
        );

        stmtProd.run(
            "Teclado Mecânico Custom", 
            "Switches lubrificados a mão, keycaps PBT, case de alumínio.", 
            1200.00, 
            "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80", 
            10, 
            "keyboard"
        );

        stmtProd.run(
            "Monitor OLED 240Hz", 
            "Pretos reais, tempo de resposta 0.03ms. O sonho de qualquer gamer.", 
            5400.00, 
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80", 
            8, 
            "monitor"
        );

        stmtProd.finalize();

        console.log(">>> Dados iniciais (Admin e Produtos) inseridos.");
    });
}

module.exports = db;
