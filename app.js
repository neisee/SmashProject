const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Archivos ESTÁTICOS del Frontend
app.use(express.static(path.join(__dirname, 'public')));

// COMENTADO HASTA QUE CREES EL ARCHIVO:
// const apiRoutes = require('./src/routes/api'); 
// app.use('/api', apiRoutes); 

// 2. Enrutador de la SPA
app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});