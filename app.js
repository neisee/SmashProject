const express = require('express');
const app = express();
const PORT = 3000;

const usuarioRoutes = require('./src/routes/usuarioRoutes');

app.use(express.json());

// Servir la carpeta public (HTML, CSS y JS del navegador)
app.use(express.static('public'));

// Enrutar las peticiones de la API
app.use('/api/usuarios', usuarioRoutes);

// El comodín definitivo compatible con Express v5 y Node v24+
// Devuelve el index.html para cualquier ruta (ej: /saludo) y deja que el frontend decida
app.get('*cualquiera', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});