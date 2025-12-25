const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Kullanıcının Açık Anahtarı (Dosya paylaşımı için gerekli)
    public_key: {
        type: DataTypes.TEXT,
        allowNull: true 
    }
}, {
    timestamps: true // created_at ve updated_at otomatik eklenir
});

module.exports = User;