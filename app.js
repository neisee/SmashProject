const express = require('express');
const http = require('http'); // 🌟 Añadido: Módulo nativo para crear el servidor HTTP
const WebSocket = require('ws'); // 🌟 Añadido: Librería ws para WebSockets
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app); // 🌟 Añadido: Servidor HTTP que envuelve a Express
const wss = new WebSocket.Server({ server }); // 🌟 Añadido: Instancia de WebSocket asociada al servidor

const PORT = process.env.PORT || 3000; 

app.use(cookieParser());
app.use(express.json());

// --- 📡 LÓGICA DE SALAS WEBSOCKET PARA LAS LIGAS ---
const leagueRooms = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Cuando el frontend se conecta, se suscribe a una liga específica
            if (data.type === 'join-league') {
                const leagueId = String(data.leagueId);
                ws.leagueId = leagueId; // Guardamos la id de la liga en el socket del cliente
                
                if (!leagueRooms.has(leagueId)) {
                    leagueRooms.set(leagueId, new Set());
                }
                leagueRooms.get(leagueId).add(ws);
            }
        } catch (err) {
            console.error('Error procesando mensaje de WebSocket:', err);
        }
    });

    ws.on('close', () => {
        // Al cerrar la pestaña o cambiar de vista, removemos al usuario de la sala
        if (ws.leagueId && leagueRooms.has(ws.leagueId)) {
            const room = leagueRooms.get(ws.leagueId);
            room.delete(ws);
            if (room.size === 0) {
                leagueRooms.delete(ws.leagueId);
            }
        }
    });
});

// Función global que llamará tu controlador para avisar a los participantes de una liga
function broadcastToLeague(leagueId, payload) {
    const room = leagueRooms.get(String(leagueId));
    if (room) {
        const message = JSON.stringify(payload);
        room.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

app.set('broadcastToLeague', broadcastToLeague);
// 1. RUTAS DE LA API
const apiRoutes = require('./src/routes/api'); 
app.use('/api', apiRoutes); 

// 2. Archivos ESTÁTICOS del Frontend
app.use(express.static(path.join(__dirname, 'public')));

// 3. Enrutador de la SPA (Corregido el '*path' por '*')
app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🌟 CAMBIO IMPORTANTE: Ahora escuchamos con 'server', no con 'app'
server.listen(PORT, () => {
    console.log(`Servidor HTTP y WebSocket corriendo en el puerto ${PORT}`);
});

// 🔥 Exportamos la función para que 'leagueController.js' pueda requerirla
module.exports = { broadcastToLeague };