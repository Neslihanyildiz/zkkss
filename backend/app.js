require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => res.json({ message: 'SecureShare API running' }));

// Routes
app.use('/api/auth',  require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/logs',  require('./routes/logRoutes'));

module.exports = app;
