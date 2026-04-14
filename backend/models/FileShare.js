const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const File = require('./File');
const User = require('./User');

// Maps to the 'file_shares' table created by server.js
const FileShare = sequelize.define('FileShare', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    file_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    from_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    to_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Recipient's RSA-encrypted AES key
    encrypted_key: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'file_shares',
    timestamps: false
});

FileShare.belongsTo(File, { foreignKey: 'file_id' });
FileShare.belongsTo(User, { as: 'sender',   foreignKey: 'from_user_id' });
FileShare.belongsTo(User, { as: 'recipient', foreignKey: 'to_user_id' });

module.exports = FileShare;
