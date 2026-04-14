const { Sequelize } = require('sequelize');
const path = require('path');

// Point to the same project.db that server.js created so data is shared
const dbPath = path.join(__dirname, '../project.db');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

module.exports = sequelize;
