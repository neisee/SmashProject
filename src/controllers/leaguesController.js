const pool = require('../models/db');

// OBTENER TODAS LAS LIGAS
exports.obtenerLigas = async (req, res) => {
    try {
        // Envolvemos "Leagues" y "Users" entre comillas dobles 
        // para obligar a Postgres a respetar las mayúsculas.
        const query = `
            SELECT l.league_id, l.name, u.username as creador, l.invitation_code, l.in_progress 
            FROM leagues l
            JOIN users u ON l.creator_id = u.user_id
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows); 
    } catch (error) {
        console.error('Error al obtener ligas:', error);
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
};

// CREAR UNA LIGA NUEVA (Para probar inserciones)
exports.crearLiga = async (req, res) => {
    const { name, creator_id, invitation_code } = req.body;
    try {
        const query = `
            INSERT INTO Leagues (name, creator_id, invitation_code) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const valores = [name, creator_id, invitation_code];
        const resultado = await pool.query(query, valores);
        
        res.status(201).json({ mensaje: '¡Liga creada!', liga: resultado.rows[0] });
    } catch (error) {
        console.error('Error al crear liga:', error);
        res.status(500).json({ error: 'No se pudo crear la liga' });
    }
};