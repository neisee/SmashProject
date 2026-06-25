const LeagueModel = require('../models/leagueModel');

const leagueController = {
    getLeagues: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'No autorizado.' });
        }

        try {
            const cookieValue = req.cookies.auth_session;
            const userId = cookieValue.split('logged_in_user_')[1];

            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;

            const leagues = await LeagueModel.findPagedByUserId(userId, limit, offset);
            return res.status(200).json(leagues);
        } catch (error) {
            console.error('Error al obtener las ligas paginadas:', error);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
    },

    createLeague: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Non authorized. Log in first' });
        }

        const { name, inv_code } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'League name is required' });
        }

        try {
            const cookieValue = req.cookies.auth_session;
            const creatorId = cookieValue.split('logged_in_user_')[1];

            const leagueExists = await LeagueModel.findByName(name);
            if (leagueExists) {
                return res.status(400).json({ error: 'League name is already taken' });
            }
            if (inv_code.length > 128) {
                return res.status(400).json({ error: 'Invitation Code cannot be longer than 128 characters.' });
            }

            const newLeagueId = await LeagueModel.createLeagueWithParticipant(name, inv_code, creatorId);

            return res.status(201).json({ 
                message: 'League successfully created!', 
                leagueId: newLeagueId 
            });
        } catch (error) {
            console.error('League creation error', error);
            return res.status(500).json({ error: 'Database server error' });
        }
    },

    joinLeague: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Non authorized. Log in first' });
        }
        const { name, inv_code } = req.body;
        if(!name){
            return res.status(400).json({error: 'League name is required'});
        }
        try{
            const cookieValue = req.cookies.auth_session;
            const userId = cookieValue.split('logged_in_user_')[1];
            const league = await LeagueModel.findByName(name);
            if(!league){
                return res.status(400).json({ error: 'Wrong name or invitation code' });
            }
            if(await LeagueModel.isInProgress(league.league_id)){
                return res.status(400).json({ error: 'This league has already started'});
            }
            const isParticipant = await LeagueModel.isParticipant(userId, league.league_id);
            if(isParticipant){
                return res.status(400).json({error: 'You are already a participant in this league'});
            }
            const newParticipant = await LeagueModel.joinLeague(userId, league.league_id);
            return res.status(200).json({
                message: `joined the league: ${league.name}!`,
                leagueId: league.league_id
            })
        } catch (error) {
            console.error('Joining league error', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'You are already a participant in this league.' });
            }
            return res.status(500).json({error: 'Database server error'});
        }
    },

    getLeagueDetails: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Not authorized. Please log in first.' });
        }

        const { id } = req.params;

        try {
            const cookieValue = req.cookies.auth_session;
            const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);

            const league = await LeagueModel.findById(id);
            if (!league) return res.status(404).json({ error: 'League not found.' });

            const participants = await LeagueModel.getParticipants(id);

            const isParticipant = participants.some(p => p.user_id === currentUserId);
            if (!isParticipant) {
                return res.status(403).json({ error: 'Access denied. You are not a participant.' });
            }

            // 💥 AQUÍ ESTÁ LA CLAVE: Comparamos IDs numéricos en el servidor
            const isCreator = (league.creator_id === currentUserId);

            return res.status(200).json({
                league,
                participants,
                isCreator // 👈 Enviamos este booleano limpio al frontend
            });

        } catch (error) {
            console.error('Error fetching league details:', error);
            return res.status(500).json({ error: 'Database server error.' });
        }
    },

    kickParticipant: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Not authorized.' });
        }

        const { leagueId, userIdToKick } = req.body;
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);

        try {
            // Buscar la liga para verificar quién es el creador real
            const league = await LeagueModel.findById(leagueId);
            if (!league) return res.status(404).json({ error: 'League not found.' });

            // 🔥 VALIDACIÓN DE SEGURIDAD ABSOLUTA 🔥
            if (league.creator_id !== currentUserId) {
                return res.status(403).json({ error: 'Only the league creator can kick players.' });
            }

            // No permitir que el creador se auto-elimine de su propia liga
            if (parseInt(userIdToKick, 10) === currentUserId) {
                return res.status(400).json({ error: 'You cannot kick yourself from your own league.' });
            }

            // Proceder a la eliminación
            await LeagueModel.removeParticipant(leagueId, userIdToKick);

            return res.status(200).json({ message: 'Player removed successfully.' });

        } catch (error) {
            console.error('Error kicking participant:', error);
            return res.status(500).json({ error: 'Server error.' });
        }
    },

    startLeague: async (req, res) => {
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Not authorized.' });
        }

        const { id: leagueId } = req.params;
        const cookieValue = req.cookies.auth_session;
        const currentUserId = parseInt(cookieValue.split('logged_in_user_')[1], 10);
        try{
            const league = await LeagueModel.findById(leagueId);
            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }
            if(league.in_progress){
                return res.status(400).json({ error: 'League has already started.'});
            }
            // 2. 🔥 CONTROL DE SEGURIDAD: ¿El de la cookie es el creador?
            if (league.creator_id !== currentUserId) {
                return res.status(403).json({ error: 'Access denied. Only the creator can start this league.' });
            }

            const participantIds = await LeagueModel.getParticipantsIds(leagueId);
            if (participantIds.length < 2) {
                return res.status(400).json({ error: 'Cannot start a league with less than 2 players.' });
            }
            const randomizedParticipants = [...participantIds];
            if (randomizedParticipants.length % 2 !== 0){
                randomizedParticipants.push(null);
            }
            for (let i = randomizedParticipants.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Intercambiamos los elementos en las posiciones i y j
                [randomizedParticipants[i], randomizedParticipants[j]] = [randomizedParticipants[j], randomizedParticipants[i]];
            }
            for (let i = 1; i<randomizedParticipants.length; i++){
                const roundId = await LeagueModel.createRound(leagueId);
                for(let j=0; j<randomizedParticipants.length/2; j++){
                    const player1 = randomizedParticipants[j];
                    const player2 = randomizedParticipants[randomizedParticipants.length-1-j];
                    await LeagueModel.createMatch(player1, player2, leagueId, roundId);
                }
                randomizedParticipants.splice(1, 0, randomizedParticipants.pop());
            }
            const rounds = await LeagueModel.getAllRoundsId(leagueId);
            for (let i = rounds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Intercambiamos los elementos en las posiciones i y j
                [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
            }
            for (let i=0;i<rounds.length;i++){
                await LeagueModel.updateRoundNumber(rounds[i], i+1);
            }
            await LeagueModel.updateInProgress(leagueId, true);
            return res.status(200).json({ message: 'League successfully started and rounds generated.' });
        } catch (error){
            console.error('Error starting league:', error);
            return res.status(500).json({ error: 'Server error.' });
        }
    }
};

module.exports = leagueController;