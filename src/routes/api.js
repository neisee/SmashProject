// src/routes/api.js
const bcrypt = require('bcrypt');
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
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const result = await pool.query(
            'INSERT INTO Users (username, hashed_password) VALUES ($1, $2) RETURNING user_id, username',
            [username.trim(), hashedPassword]
        );
        return res.status(201).json({
            message: 'User registered successfully!',
            user: result.rows[0]
        });

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

        const passwordMatch = await bcrypt.compare(password, user.hashed_password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        
        res.cookie('auth_session', 'logged_in_user_' + user.user_id, {
            httpOnly: true,    // Protege contra ataques XSS (JavaScript no puede leerla)
            secure: false,     // Cambiar a true cuando uses HTTPS en producción
            sameSite: 'lax',   // Protección básica contra CSRF
            maxAge: 24 * 60 * 60 * 1000 // Expira en 1 día
        });

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

router.get('/auth/status', (req, res) => {
    // Comprobamos si existe nuestra cookie
    if (req.cookies && req.cookies.auth_session) {
        return res.status(200).json({ loggedIn: true });
    }
    return res.status(200).json({ loggedIn: false });
});

router.post('/auth/logout', (req, res) => {
    // Borramos la cookie pasándole el mismo nombre y las mismas opciones de seguridad
    res.clearCookie('auth_session', {
        httpOnly: true,
        secure: false, // Cambiar a true en producción con HTTPS
        sameSite: 'lax'
    });

    console.log('📌 User logged out successfully');
    return res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;