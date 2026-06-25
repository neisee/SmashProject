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
    }
};

module.exports = leagueController;