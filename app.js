const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Tus datos de siempre (El "Repository")
app.get('/api/usuarios', (req, res) => {
    const usuarios = [
        { id: 1, nombre: 'Chaval', rol: 'Developer Node' },
        { id: 2, nombre: 'Profe', rol: 'Java Senior' }
    ];
    res.json(usuarios);
});

// 🌟 Truco PRO: Cualquier ruta que no sea /api va a escupir el index.html
// Esto permite que si refrescas la página estando en "/saludo", no de un error 404
app.get('*cualquiera', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`🚀 SPA corriendo en http://localhost:${PORT}`);
});