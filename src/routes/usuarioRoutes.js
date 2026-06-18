const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Cuando pidan la raíz de este bloque, ejecuta el controlador
router.get('/', usuarioController.getUsuarios);

module.exports = router;