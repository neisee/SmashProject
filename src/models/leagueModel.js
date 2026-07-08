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
        const query = `
            SELECT 
                u.user_id,
                u.username,
                -- Contar victorias
                COALESCE(SUM(CASE 
                    WHEN (m.player1 = u.user_id AND m.lives_player1 > m.lives_player2) OR 
                        (m.player2 = u.user_id AND m.lives_player2 > m.lives_player1) THEN 1 
                    ELSE 0 
                END), 0) AS wins,
                -- Contar derrotas
                COALESCE(SUM(CASE 
                    WHEN (m.player1 = u.user_id AND m.lives_player1 < m.lives_player2) OR 
                        (m.player2 = u.user_id AND m.lives_player2 < m.lives_player1) THEN 1 
                    ELSE 0 
                END), 0) AS losses,
                -- Sumar vidas a favor
                COALESCE(SUM(CASE 
                    WHEN m.player1 = u.user_id THEN m.lives_player1 
                    WHEN m.player2 = u.user_id THEN m.lives_player2 
                    ELSE 0 
                END), 0) AS lives_won,
                -- Sumar vidas en contra
                COALESCE(SUM(CASE 
                    WHEN m.player1 = u.user_id THEN m.lives_player2 
                    WHEN m.player2 = u.user_id THEN m.lives_player1 
                    ELSE 0 
                END), 0) AS lives_against
            FROM Participants pt
            JOIN Users u ON pt.user_id = u.user_id
            LEFT JOIN Matches m ON (m.player1 = u.user_id OR m.player2 = u.user_id) AND m.league_id = $1
            WHERE pt.league_id = $1
            GROUP BY u.user_id, u.username;
        `;
        
        const { rows } = await pool.query(query, [leagueId]);
        return rows;
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
    },

    getPlayedMatches: async (leagueId) => {
        const queryMatches = `
            SELECT player1, player2, lives_player1, lives_player2 
            FROM Matches 
            WHERE league_id = $1 
              AND lives_player1 IS NOT NULL 
              AND lives_player2 IS NOT NULL
        `;
        try {
            const { rows } = await pool.query(queryMatches, [leagueId]);
            return rows;
        } catch (error) {
            console.error('Error en LeagueModel.getPlayedMatches:', error);
            throw error;
        }
    },

    getMatchesWithRounds: async (leagueId) => {
        const query = `
            SELECT 
                m.id, 
                m.player1, 
                m.player2, 
                m.lives_player1, 
                m.lives_player2, 
                r.round_number
            FROM Matches m
            JOIN Rounds r ON m.round_id = r.round_id
            WHERE m.league_id = $1
            ORDER BY r.round_number ASC
        `;
        const { rows } = await pool.query(query, [leagueId]);
        return rows;
    },

    getLeagueMatches: async (leagueId, currentUserId) => {
        const query = `
            SELECT 
                m.id,
                m.player1,
                m.player2,
                m.lives_player1,
                m.lives_player2,
                r.round_number,
                u1.username AS player1_name,
                u2.username AS player2_name
            FROM Matches m
            LEFT JOIN Rounds r ON m.round_id = r.round_id
            LEFT JOIN Users u1 ON m.player1 = u1.user_id
            LEFT JOIN Users u2 ON m.player2 = u2.user_id
            WHERE m.league_id = $1
              AND ($2 IN (m.player1, m.player2))
            ORDER BY r.round_number ASC, m.id ASC
        `;
        const { rows } = await pool.query(query, [leagueId, currentUserId]);
        return rows;
    },

    getNextMatchForUser: async (leagueId, userId) => {
        const query = `
            SELECT 
                m.*, 
                r.round_number
            FROM Matches m
            JOIN Rounds r ON m.round_id = r.round_id
            WHERE m.league_id = $1 
              AND ($2 IN (m.player1, m.player2))
              AND m.lives_player1 IS NULL 
              AND m.lives_player2 IS NULL
            ORDER BY r.round_number ASC
            LIMIT 1
        `;
        const { rows } = await pool.query(query, [leagueId, userId]);
        return rows[0] || null; // Devuelve el objeto del partido o null si no hay
    },

    updateMatchScore: async (leagueId, player1Id, player2Id, livesPlayer1, livesPlayer2) => {
        const isP1Null = (!player1Id || player1Id === 'null');
        const isP2Null = (!player2Id || player2Id === 'null');

        let query = `UPDATE Matches SET lives_player1 = $1, lives_player2 = $2 WHERE league_id = $3`;
        const params = [livesPlayer1, livesPlayer2, leagueId];

        // Condición para Player 1
        if (isP1Null) {
            query += ` AND player1 IS NULL`;
        } else {
            params.push(player1Id);
            query += ` AND player1 = $${params.length}`;
        }

        // Condición para Player 2
        if (isP2Null) {
            query += ` AND player2 IS NULL`;
        } else {
            params.push(player2Id);
            query += ` AND player2 = $${params.length}`;
        }

        // Aquí sí está definido pool
        const { rowCount } = await pool.query(query, params);
        return rowCount > 0;
    },

    deleteLeague: async (leagueId) => {
        const query = 'DELETE FROM Leagues WHERE league_id = $1';
        const result = await pool.query(query, [leagueId]);
        // 🆕 Retorna true si eliminó la fila, false si no encontró ninguna que coincida
        return result.rowCount > 0; 
    },

    getBlockedCharacters: async (leagueId, playerId) => {
        const query = `
            SELECT DISTINCT c.character_id FROM CharactersS c
            JOIN Matches m ON (c.character_id = m.character1 OR c.character_id = m.character2)
            WHERE m.league_id = $2
            AND (
                (m.player1 = $1 AND m.character1 = c.character_id AND m.lives_player1 > m.lives_player2)
                OR 
                (m.player2 = $1 AND m.character2 = c.character_id AND m.lives_player2 > m.lives_player1)
            )`
        const { rows } = await pool.query(query, [playerId, leagueId]);
        return rows.map(row => row.characterId);
    },

    isPartOfTheMatch: async (userId, matchId) => {
        const query = 'SELECT * FROM Matches WHERE id = $1 AND (player1 = $2 OR player2 = $2)';
        const result = await pool.query(query, [matchId, userId]);
        return result.rows[0];
    },
    
    addCharacterInMatch: async (characterId, matchId, playerId) => {
        const querySelect = 'SELECT player1, player2 FROM Matches WHERE id = $1';
        const partido = await pool.query(querySelect, [matchId]);

        if (partido.rows.length === 0) {
            throw new Error('MATCH_NOT_FOUND');
        }

        const { player1, player2 } = partido.rows[0];
        let columnaAEditar = null;

        if (playerId === player1) {
            columnaAEditar = 'character1';
        } else if (playerId === player2) {
            columnaAEditar = 'character2';
        } else {
            throw new Error('PLAYER_NOT_IN_MATCH');
        }

        const queryUpdate = `
            UPDATE Matches 
            SET ${columnaAEditar} = $1 
            WHERE id = $2
        `;

        await pool.query(queryUpdate, [characterId, matchId]);
        return { success: true, columnUpdated: columnaAEditar };
    }
};

module.exports = LeagueModel;