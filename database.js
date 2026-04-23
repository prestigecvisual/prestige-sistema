const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Criar banco de dados
const db = new sqlite3.Database(path.join(__dirname, 'prestige.db'));

// Criar tabelas
db.serialize(() => {
    // Tabela de produtos
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco REAL NOT NULL,
            imagem TEXT,
            estoque INTEGER DEFAULT 0,
            categoria TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela de pedidos
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE,
            cliente_nome TEXT,
            cliente_email TEXT,
            cliente_telefone TEXT,
            endereco TEXT,
            produtos TEXT,
            valor_total REAL,
            metodo_pagamento TEXT,
            status TEXT DEFAULT 'pendente',
            payment_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Inserir produtos de exemplo
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row.count === 0) {
            const produtosExemplo = [
                ['Camisa Social Premium', 'Camisa social de alta qualidade', 149.90, 'https://via.placeholder.com/300', 50, 'camisas'],
                ['Calça Jeans Skinny', 'Calça jeans moderna e confortável', 189.90, 'https://via.placeholder.com/300', 30, 'calcas'],
                ['Tênis Esportivo', 'Tênis para corrida e lazer', 299.90, 'https://via.placeholder.com/300', 20, 'tenis'],
                ['Relógio Prata', 'Relógio analógico elegante', 399.90, 'https://via.placeholder.com/300', 15, 'acessorios'],
                ['Mochila Executiva', 'Mochila para notebook', 259.90, 'https://via.placeholder.com/300', 25, 'mochilas'],
                ['Boné Estiloso', 'Boné ajustável', 79.90, 'https://via.placeholder.com/300', 40, 'acessorios']
            ];

            const stmt = db.prepare("INSERT INTO products (nome, descricao, preco, imagem, estoque, categoria) VALUES (?, ?, ?, ?, ?, ?)");
            produtosExemplo.forEach(p => stmt.run(p));
            stmt.finalize();
            console.log('✅ Produtos de exemplo inseridos');
        }
    });
});

module.exports = db;