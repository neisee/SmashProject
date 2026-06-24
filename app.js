const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(express.json());

// 1. RUTAS DE LA API (¡Descomentadas y arriba!)
const apiRoutes = require('./src/routes/api'); 
app.use('/api', apiRoutes); 

// 2. Archivos ESTÁTICOS del Frontend
app.use(express.static(path.join(__dirname, 'public')));

// 3. Enrutador de la SPA (Siempre al final)
app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});