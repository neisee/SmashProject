const express = require('express');
const router = express.Router();
const leaguesController = require('../controllers/leaguesController');

// Ruta para listar ligas (GET /api/leagues)
router.get('/leagues', leaguesController.obtenerLigas);

// Ruta para crear una liga (POST /api/leagues)
router.post('/leagues', leaguesController.crearLiga);

module.exports = router;