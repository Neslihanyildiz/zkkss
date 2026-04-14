require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ message: 'SecureShare API running' }));

app.use('/api/auth',  require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

module.exports = app;
