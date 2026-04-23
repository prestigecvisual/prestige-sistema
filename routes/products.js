const db = require('../database.js');

// Buscar todos os produtos
function getAllProducts(callback) {
    db.all("SELECT * FROM products WHERE estoque > 0 ORDER BY id", callback);
}

// Buscar produto por ID
function getProductById(id, callback) {
    db.get("SELECT * FROM products WHERE id = ?", [id], callback);
}

// Buscar por categoria
function getProductsByCategory(categoria, callback) {
    db.all("SELECT * FROM products WHERE categoria = ? AND estoque > 0", [categoria], callback);
}

module.exports = { getAllProducts, getProductById, getProductsByCategory };