const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

// Maps to the 'files' table created by server.js
const File = sequelize.define('File', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // FK column in project.db is 'user_id'
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    path: {
        type: DataTypes.STRING,
        allowNull: false
    },
    upload_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'files',
    timestamps: false
});

File.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(File, { foreignKey: 'user_id' });

module.exports = File;
