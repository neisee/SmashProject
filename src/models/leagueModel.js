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
    },

    findByNameAndCode: async (name, inv_code) => {
        const query = 'SELECT * FROM Leagues WHERE LOWER(name) = LOWER($1) AND invitation_code = $2';
        const result = await pool.query(query, [name, inv_code]);
        return result.rows[0];
    },

    joinLeague: async (userId, leagueId) => {
        const query = 'INSERT INTO Participants(league_id, user_id) VALUES ($1, $2) RETURNING *';
        const result = await pool.query(query, [leagueId, userId]);
        return result.rows[0];
    },

    isParticipant: async (userId, leagueId) => {
        const query = 'SELECT * FROM Participants WHERE user_id = $1 AND league_id = $2';
        const result = await pool.query(query, [userId, leagueId]);
        return result.rows[0];
    },

    isInProgress: async (leagueId) => {
        const query = 'SELECT in_progress FROM Leagues WHERE league_id = $1';
        const result = await pool.query(query, [leagueId]);
        return result.rows[0].in_progress;
    },

    findById: async (leagueId) => {
        const query = 'SELECT * FROM Leagues WHERE league_id = $1';
        const result = await pool.query(query, [leagueId]);
        return result.rows[0];
    },

    getParticipants: async (leagueId) => {
        // Hacemos un INNER JOIN para sacar el username real desde la tabla Users
        const query = `
            SELECT u.user_id, u.username 
            FROM Participants p
            INNER JOIN Users u ON p.user_id = u.user_id
            WHERE p.league_id = $1
        `;
        const result = await pool.query(query, [leagueId]);
        return result.rows; // Devuelve el array completo de filas
    },

    removeParticipant: async (leagueId, userId) => {
        // Ajusta 'Participants' al nombre exacto de tu tabla intermedia
        const query = 'DELETE FROM Participants WHERE league_id = $1 AND user_id = $2';
        await pool.query(query, [leagueId, userId]);
    },

    getParticipantsIds: async (leagueId) => {
        const query = 'SELECT user_id FROM Participants WHERE league_id = $1';
        const { rows } = await pool.query(query, [leagueId]);
        
        // Mapeamos para devolver un array simple de números [1, 4, 12...] en vez de un array de objetos
        return rows.map(row => row.user_id);
    },

    createRound: async (leagueId) => {
        const query = 'INSERT INTO Rounds(league_id, round_number) VALUES ($1, 0) RETURNING round_id';
        const { rows } = await pool.query(query, [leagueId]);
        return rows[0].round_id;
    },

    createMatch: async (player1, player2, leagueId, roundId) => {
        const query = 'INSERT INTO Matches(player1, player2, league_id, round_id) VALUES ($1, $2, $3, $4)';
        await pool.query(query, [player1, player2, leagueId, roundId]);
    },

    updateInProgress: async (leagueId, status) => {
        const query = 'UPDATE Leagues SET in_progress = $1 WHERE league_id = $2';
        await pool.query(query, [status, leagueId]);
    },

    updateRoundNumber: async (roundId, newNumber)=> {
        const query = 'UPDATE Rounds SET round_number = $1 WHERE round_id = $2';
        await pool.query(query, [newNumber, roundId]);
    },

    getAllRoundsId: async (leagueId) => {
        const query = 'SELECT round_id FROM Rounds WHERE league_id = $1';
        const { rows } = await pool.query(query, [leagueId]);
        return rows.map(row => row.round_id);
    }
};

module.exports = LeagueModel;