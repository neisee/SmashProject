const pool = require('./db');

const LeagueModel = {
    // Obtener ligas paginadas de un usuario
    findPagedByUserId: async (userId, limit, offset) => {
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
        return result.rows;
    },

    // Buscar liga por nombre (para validación)
    findByName: async (name) => {
        const query = 'SELECT * FROM Leagues WHERE LOWER(name) = LOWER($1)';
        const result = await pool.query(query, [name]);
        return result.rows[0];
    },

    // Crear liga y añadir al creador como participante (usando una transacción básica)
    createLeagueWithParticipant: async (name, invCode, creatorId) => {
        // Nota: Idealmente usarías BEGIN/COMMIT si requieres transacciones estrictas, 
        // pero mantenemos la lógica original separada en funciones secuenciales.
        const newLeagueResult = await pool.query(
            'INSERT INTO Leagues(name, invitation_code, creator_id) VALUES ($1, $2, $3) RETURNING league_id',
            [name, invCode, creatorId]
        );
        const newLeagueId = newLeagueResult.rows[0].league_id;

        await pool.query(
            'INSERT INTO Participants (league_id, user_id) VALUES ($1, $2)',
            [newLeagueId, creatorId]
        );

        return newLeagueId;
    }
};

module.exports = LeagueModel;