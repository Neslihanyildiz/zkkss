const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    action: {
        type: DataTypes.STRING, 
        allowNull: false
        // Örnek: 'LOGIN', 'REGISTER', 'FILE_UPLOAD', 'FILE_DELETE'
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true
        // Örnek: "Ahmet 'tez.pdf' dosyasını yükledi."
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true // created_at bize işlemin ZAMANINI verecek
});

// İlişki: Bir logu bir kullanıcı oluşturur
AuditLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });

module.exports = AuditLog;