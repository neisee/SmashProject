// src/models/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Creamos el pool pasándole directamente la URL de conexión completa
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Esto evita fallos con los certificados SSL de Render/Supabase
    }
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