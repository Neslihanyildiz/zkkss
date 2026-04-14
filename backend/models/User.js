const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Maps to the 'users' table created by server.js (column: password, no timestamps)
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
    // Column is named 'password' in project.db (bcrypt hash stored here)
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    public_key: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: false
});

module.exports = User;
