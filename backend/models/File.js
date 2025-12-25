const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User'); // İlişki kurmak için User modelini çağırdık

const File = sequelize.define('File', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // Şifreli dosyanın diskteki adı (Örn: 1735492.enc)
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Kullanıcının gördüğü şifreli isim (Örn: "GizliBelge.pdf.enc")
    original_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Dosyanın türü (application/pdf, image/png vb.)
    mimetype: {
        type: DataTypes.STRING
    },
    // Dosya boyutu (byte cinsinden)
    size: {
        type: DataTypes.INTEGER
    },
    // Dosya yolu
    path: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true
});

// --- İLİŞKİLER (RELATIONS) ---
// Bir dosyanın bir sahibi olur
File.belongsTo(User, { foreignKey: 'owner_id' });
// Bir kullanıcının birden çok dosyası olabilir
User.hasMany(File, { foreignKey: 'owner_id' });

module.exports = File;