const express = require('express');
const path = require('path');
const app = express();
// 🌟 CAMBIO 1: Dejar que Render elija el puerto en producción
const PORT = process.env.PORT || 3000; 
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(express.json());

// 1. RUTAS DE LA API
const apiRoutes = require('./src/routes/api'); 
app.use('/api', apiRoutes); 

// 2. Archivos ESTÁTICOS del Frontend
app.use(express.static(path.join(__dirname, 'public')));

// 3. Enrutador de la SPA (Corregido)
// 🌟 CAMBIO 2: En Express se usa '*' estándar, no '*path'
app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});