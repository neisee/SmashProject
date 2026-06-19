const express = require('express');
const app = express();
const PORT = 3000;

// ❌ BORRAMOS la línea de usuarioRoutes (ya no la necesitamos)
// const usuarioRoutes = require('./src/routes/usuarioRoutes'); 

app.use(express.json());

// ✅ MANTENER: Sirve tus archivos (HTML, CSS, JS) automáticamente
app.use(express.static('public'));

// ❌ BORRAMOS el enrutador de usuarios viejo
// app.use('/api/usuarios', usuarioRoutes);

// ✅ MANTENER: Es el truco para que las rutas SPA funcionen sin recargar
app.get('*cualquiera', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ✅ MANTENER: Enciende el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});