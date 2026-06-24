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

router.get('/leagues', async (req, res) => {
    if (!req.cookies || !req.cookies.auth_session) {
        return res.status(401).json({ error: 'No autorizado.' });
    }

    try {
        const cookieValue = req.cookies.auth_session;
        const userId = cookieValue.split('logged_in_user_')[1];

        // Capturamos los parámetros de paginación de la URL (ej: /api/leagues?limit=10&offset=0)
        // Usamos parseInt para asegurarnos de que son números
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // Consulta que limita los resultados y se salta los que ya cargamos
        const query = `
            SELECT 
                l.league_id,
                l.name,
                u.username AS creador,
                l.invitation_code,
                l.in_progress
            FROM Leagues l
            INNER JOIN Participants p ON l.league_id = p.league_id
            INNER JOIN Users u ON l.creator_id = u.user_id
            WHERE p.user_id = $1
            ORDER BY l.league_id DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, limit, offset]);

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener las ligas paginadas:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

router.post('/auth/create-league', async (req, res) => {
    if (!req.cookies || !req.cookies.auth_session) {
        return res.status(401).json({ error: 'Non authorized. Log in first' });
    }
    const { name, inv_code } = req.body;
    if (!name || !inv_code) {
        return res.status(400).json({ error: 'League name and invitation code are required' });
    }
    try{
        const cookieValue = req.cookies.auth_session;
        const creatorId = cookieValue.split('logged_in_user_')[1];
        const nameCheck = await pool.query(
            'SELECT * FROM Leagues WHERE LOWER(name) = LOWER($1)', 
            [name]
        );
        if (nameCheck.rows.length > 0) {
            return res.status(400).json({ error: 'League name is already taken' });
        }
        if (inv_code.length > 8) {
            return res.status(400).json({ error: 'Invitation Code cannot be longer than 8 characters.' });
        }
        const newLeagueResult = await pool.query(
            'INSERT INTO Leagues(name, invitation_code, creator_id) VALUES ($1, $2, $3) RETURNING league_id',
            [name, inv_code, creatorId]
        );
        const newLeagueId = newLeagueResult.rows[0].league_id;
        await pool.query(
            'INSERT INTO Participants (league_id, user_id) VALUES ($1, $2)',
            [newLeagueId, creatorId]
        );
        return res.status(201).json({ 
            message: 'League successfully created!', 
            leagueId: newLeagueId 
        });
    } catch (error) {
        console.error('League creation error', error);
        return res.status(500).json({ error: 'Database server error' });
    }
})

module.exports = router;