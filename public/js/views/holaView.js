// Estado global de la vista para controlar la paginación
let currentOffset = 0;
const LEAGUE_LIMIT = 1; // Lo dejamos en 1 para que pruebes el botón cómodamente

export async function renderHola() {
    const mainContainer = document.getElementById('vista-principal');
    
    // Reiniciamos el offset cada vez que el usuario entra de cero a la vista
    currentOffset = 0;

    // 1. Inyectamos la estructura del Dashboard (Texto de la web en inglés)
    mainContainer.innerHTML = `
        <div class="dashboard" style="width: 100%; max-width: 500px; margin: 0 auto;">
            
            <div class="dashboard-actions" style="display: flex; gap: 12px; margin-bottom: 25px; justify-content: center;">
                <button id="btn-create-league" class="btn-nav" style="border-color: #e6e6e6; color: #e6e6e6;">Create League</button>
                <button id="btn-join-league" class="btn-nav btn-fire-join">Join League</button>
            </div>

            <h2>🏆 My Leagues</h2>
            <div id="leagues-list"></div>
            
            <div id="load-more-container" style="text-align: center; margin-top: 20px;">
                <button id="btn-load-more" class="btn-nav" style="display: none;">Load more leagues</button>
            </div>
        </div>
    `;

    // 2. Escuchas de eventos para los nuevos botones
    document.getElementById('btn-create-league').addEventListener('click', () => {
        window.history.pushState({}, '', '/create-league');
        window.dispatchEvent(new Event('popstate'));
    });

    document.getElementById('btn-join-league').addEventListener('click', () => {
        window.history.pushState({}, '', '/join-league');
        window.dispatchEvent(new Event('popstate'));
    });

    // 🆕 NUEVO: Escucha de eventos mediante DELEGACIÓN en el contenedor padre de las ligas
    document.getElementById('leagues-list').addEventListener('click', (e) => {
        // Buscamos si el elemento clickeado o alguno de sus padres tiene la clase 'league-card'
        const card = e.target.closest('.league-card');
        if (card) {
            const leagueId = card.getAttribute('data-id');
            // Redirigimos a la ruta dinámica que configuramos en tu router
            window.history.pushState({}, '', `/league/${leagueId}`);
            window.dispatchEvent(new Event('popstate'));
        }
    });

    // 3. Disparamos la carga inicial de la primera liga
    await fetchLeagues();

    // 4. Escuchamos el click del botón para cargar más
    document.getElementById('btn-load-more').addEventListener('click', fetchLeagues);
}

async function fetchLeagues() {
    const leaguesListContainer = document.getElementById('leagues-list');
    const btnLoadMore = document.getElementById('btn-load-more');

    // Si es la primera carga, mostramos un placeholder de carga interno
    if (currentOffset === 0) {
        leaguesListContainer.innerHTML = '<p style="text-align: center; color: #888;">Loading your leagues...</p>';
    } else {
        btnLoadMore.innerText = "Loading...";
        btnLoadMore.disabled = true;
    }

    try {
        const response = await fetch(`/api/leagues?limit=${LEAGUE_LIMIT}&offset=${currentOffset}`);
        const leaguesData = await response.json();

        // Si es la primera carga y el array viene vacío, el usuario no tiene ligas
        if (currentOffset === 0 && (!leaguesData || leaguesData.length === 0)) {
            leaguesListContainer.innerHTML = `
                <p style="color: #888; text-align: center; margin-top: 20px;">
                    You haven't joined any leagues yet. <br>Create your own or join one above!
                </p>
            `;
            btnLoadMore.style.display = 'none';
            return;
        }

        // Limpiamos el texto "Loading..." antes de renderizar las tarjetas reales
        if (currentOffset === 0) {
            leaguesListContainer.innerHTML = '';
        }

        // 🔄 MODIFICADO: Añadida la clase 'league-card', el data-id y estilos hover/pointer
        const leaguesHtml = leaguesData.map(league => `
            <div class="league-card" data-id="${league.league_id}" style="background: #1a1a1a; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333; cursor: pointer; transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.borderColor='#4caf50'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#333'; this.style.transform='translateY(0)'">
                <h3 style="margin-top: 0; color: white;">${league.name}</h3>
                <p style="margin: 5px 0; color: #ccc;">👤 Creator: <strong>${league.creador}</strong></p>
                <p style="margin: 5px 0; color: #ccc;">🔑 Code: <code>${league.invitation_code}</code></p>
                <span style="font-size: 14px; color: ${league.in_progress ? '#ff9800' : '#4caf50'}">
                    ${league.in_progress ? '⏳ In progress' : '🟢 Open registrations'}
                </span>
            </div>
        `).join('');

        // Añadimos las nuevas ligas al final del contenedor acumulándolas
        leaguesListContainer.innerHTML += leaguesHtml;

        // Restauramos el estado visual del botón
        btnLoadMore.disabled = false;
        btnLoadMore.innerText = "Load more leagues";

        // Lógica de control para ocultar o mostrar el botón de paginación
        if (leaguesData.length < LEAGUE_LIMIT) {
            btnLoadMore.style.display = 'none';
        } else {
            btnLoadMore.style.display = 'inline-block';
            currentOffset += LEAGUE_LIMIT; // Incrementamos el offset global
        }

    } catch (error) {
        console.error("Error fetching leagues from server:", error);
        if (currentOffset === 0) {
            leaguesListContainer.innerHTML = "❌ Error loading leagues.";
        } else {
            alert("❌ Something went wrong while loading more leagues.");
            btnLoadMore.disabled = false;
            btnLoadMore.innerText = "Load more leagues";
        }
    }
}