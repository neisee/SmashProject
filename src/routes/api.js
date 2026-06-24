// src/routes/api.js
const express = require('express');
const router = express.Router();

// IMPORTANTE: Apuntamos exactamente a tu archivo de conexión corregido
const pool = require('../models/db'); 

// Endpoint: POST /api/auth/register
router.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Comprobar si el usuario ya existe en tu tabla de PostgreSQL
        // (Asegúrate de que tu tabla en Postgres se llama 'usuarios')
        const userCheck = await pool.query(
            'SELECT * FROM Users WHERE LOWER(username) = LOWER($1)', 
            [username]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username is already taken' });
        }

        // Insertar el usuario real en tu base de datos smash_project
        await pool.query(
            'INSERT INTO Users (username, hashed_password) VALUES ($1, $2)',
            [username, password]
        );

        console.log(`User registered in Postgres: ${username}`);
        return res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('Register error', error);
        return res.status(500).json({ error: 'Database server error' });
    }
});

module.exports = router;