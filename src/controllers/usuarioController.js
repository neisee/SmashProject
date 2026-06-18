const usuarioModel = require('../models/usuarioModel');

function getUsuarios(req, res) {
    try {
        const lista = usuarioModel.obtenerTodos();
        res.json(lista); // Enviamos los datos como JSON
    } catch (error) {
        res.status(500).json({ error: "Hubo un error en el servidor" });
    }
}

module.exports = {
    getUsuarios
};