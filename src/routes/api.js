// src/routes/api.js
const express = require('express');
const router = express.Router();

// Importamos los controladores correspondientes
const authController = require('../controllers/authController');
const leagueController = require('../controllers/leagueController');
const path = require('path');
const fs = require('fs');

// Rutas de Autenticación
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/status', authController.status);
router.post('/auth/logout', authController.logout);
router.put('/auth/update-account', authController.updateAccount);

// Rutas de Ligas
router.get('/leagues', leagueController.getLeagues);
router.post('/auth/create-league', leagueController.createLeague);
router.post('/auth/join-league', leagueController.joinLeague);
router.get('/leagues/:id/details', leagueController.getLeagueDetails);
router.post('/leagues/kick', leagueController.kickParticipant);
router.put('/leagues/:id/start', leagueController.startLeague);
router.delete('/leagues/:leagueId', leagueController.deleteLeague);
router.get('/leagues/:leagueId/select-character/:matchId', leagueController.getUnableCharacters);
router.put('/leagues/:leagueId/select-character/:matchId', leagueController.selectCharacter);
router.get('/leagues/:leagueId/matches', leagueController.getLeagueMatches);
router.put('/leagues/:leagueId/matches/result', leagueController.updateMatchResult);

// Lista de imágenes de personajes disponibles
router.get('/characters', (req, res) => {
	const dir = path.join(__dirname, '..', '..', 'public', 'images', 'Characters');
	fs.readdir(dir, (err, files) => {
		if (err) {
			console.error('Error leyendo carpeta de personajes:', err);
			return res.status(500).json({ error: 'No se pudo leer la carpeta de personajes' });
		}
		// Filtrar solo imágenes (png,jpg,jpeg,gif) y ordenar por nombre
		const images = files.filter(f => /\.(png|jpe?g|gif)$/i.test(f)).sort();
		res.json({ images });
	});
});

module.exports = router;