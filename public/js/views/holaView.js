export async function renderHola() {
    const contenedor = document.getElementById('vista-principal');
    
    // 1. Ponemos un estado de "Cargando..." y la estructura básica
    contenedor.innerHTML = `
        <div class="dashboard">
            <h2>🏆 Ligas Activas</h2>
            <div id="lista-ligas">Cargando ligas...</div>
        </div>
    `;

    try {
        // 2. Hacemos la petición a nuestra API de Express
        const respuesta = await fetch('/api/leagues');
        const ligas = await respuesta.json();
        
        const listaContenedor = document.getElementById('lista-ligas');

        // 3. Si la base de datos está vacía, mostramos un mensaje amigable
        if (ligas.length === 0) {
            listaContenedor.innerHTML = `
                <p style="color: #888;">No hay ligas creadas todavía. ¡Sé el primero en armar un torneo!</p>
            `;
            return;
        }

        // 4. Si hay ligas, las mapeamos a HTML
        listaContenedor.innerHTML = ligas.map(liga => `
            <div style="background: #1a1a1a; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333;">
                <h3>${liga.name}</h3>
                <p>👤 Creador: <strong>${liga.creador}</strong></p>
                <p>🔑 Código: <code>${liga.invitation_code}</code></p>
                <span style="color: ${liga.in_progress ? '#ff9800' : '#4caf50'}">
                    ${liga.in_progress ? '⏳ En curso' : '🟢 Inscripciones abiertas'}
                </span>
            </div>
        `).join('');

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        document.getElementById('lista-ligas').innerHTML = "❌ Error al cargar las ligas.";
    }
}