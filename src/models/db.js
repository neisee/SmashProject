// src/models/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// Pequeño test de conexión al arrancar
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Error al conectar a PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conexión a PostgreSQL exitosa:', res.rows[0].now);
    }
});

module.exports = pool;