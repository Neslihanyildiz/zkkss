require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ──────────────────────────────────────────────────────────
// Auth endpoints: max 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API: max 100 requests per minute per IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'SecureShare API running' }));

app.use('/api/auth',  authLimiter, require('./routes/authRoutes'));
app.use('/api/files', apiLimiter,  require('./routes/fileRoutes'));
app.use('/api/admin', apiLimiter,  require('./routes/adminRoutes'));

module.exports = app;
