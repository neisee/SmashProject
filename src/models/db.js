// src/models/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Detectamos si estamos en Render (producción) o en nuestra PC (desarrollo)
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // 🌟 Si está en Render usa SSL, si está en Docker local lo desactiva
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Error al conectar a PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conexión a PostgreSQL exitosa:', res.rows[0].now);
    }
});

module.exports = pool;