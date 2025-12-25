const { Sequelize } = require('sequelize');
const path = require('path');

// Veritabanı dosyasının yolu (data klasörü içinde oluşacak)
const dbPath = path.join(__dirname, '../data/database.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false // Terminali SQL yazılarıyla doldurmamak için false yaptık
});

module.exports = sequelize;