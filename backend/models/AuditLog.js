const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

// Maps to the 'activity_logs' table created by server.js
const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Column is 'timestamp' in project.db, not Sequelize's createdAt
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'activity_logs',
    timestamps: false
});

AuditLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });

module.exports = AuditLog;
