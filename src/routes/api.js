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

router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try{
        const result = await pool.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'username does not exist' });
        }
        const user = result.rows[0];
        if (password !== user.hashed_password) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        console.log('User susccessfully logged in: ${user.username}');
        return res.status(200).json({ 
            message: 'Login successful!',
            user: {
                id: user.user_id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Database error during login:', error);
        return res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
});

module.exports = router;