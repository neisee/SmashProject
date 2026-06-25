// src/routes/api.js
const express = require('express');
const router = express.Router();

// Importamos los controladores correspondientes
const authController = require('../controllers/authController');
const leagueController = require('../controllers/leagueController');

// Rutas de Autenticación
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/status', authController.status);
router.post('/auth/logout', authController.logout);

// Rutas de Ligas
router.get('/leagues', leagueController.getLeagues);
router.post('/auth/create-league', leagueController.createLeague);
router.post('/auth/join-league', leagueController.joinLeague);

module.exports = router;