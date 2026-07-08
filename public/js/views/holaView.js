// Estado global de la vista para controlar la paginación
let currentOffset = 0;
const LEAGUE_LIMIT = 4; // Lo dejamos en 1 para que pruebes el botón cómodamente

function getCurrentUser() {
    return document.getElementById('btn-edit-profile')?.textContent?.trim() || '';
}

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

            <h2>My Leagues</h2>
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

    // Escucha de eventos mediante delegación en el contenedor padre de las ligas
    document.getElementById('leagues-list').addEventListener('click', (e) => {
        // Si hace clic en Eliminar, frena la tarjeta y ejecuta la función
        if (e.target.closest('.btn-delete-league')) {
            e.stopPropagation(); 
            const leagueId = e.target.closest('.btn-delete-league').getAttribute('data-id');
            eliminarLiga(leagueId);
            return;
        }

        // Buscamos si el elemento clickeado o alguno de sus padres tiene la clase 'league-card'
        const card = e.target.closest('.league-card');
        if (card) {
            const leagueId = card.getAttribute('data-id');
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
        const leaguesHtml = leaguesData.map(league => {
                // 🆕 Lógica condicional: comparamos con el usuario actual leído del DOM
                const esCreador = league.creador === getCurrentUser();
            const botonAccion = esCreador 
                ? `<button class="btn-card-action btn-delete-league" data-id="${league.league_id}">Delete</button>`
                : '';

            return `
                <div class="league-card" data-id="${league.league_id}" style="background: #1a1a1a; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333; cursor: pointer; transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.borderColor='#4caf50'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#333'; this.style.transform='translateY(0)'">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                        <div>
                            <h3 style="margin-top: 0; color: white; margin-bottom: 8px;">${league.name}</h3>
                            <p style="margin: 5px 0; color: #ccc;">Creator: <strong>${league.creador}</strong></p>
                            <p style="margin: 5px 0; color: #ccc;">Code: <code>${league.invitation_code}</code></p>
                            <span style="font-size: 14px; color: ${league.in_progress ? '#ff9800' : '#4caf50'}">
                                ${league.in_progress ? 'In progress' : 'Open registrations'}
                            </span>
                        </div>
                        ${botonAccion}
                    </div>
                </div>
            `;
        }).join('');

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
            leaguesListContainer.innerHTML = "Error loading leagues.";
        } else {
            alert("Something went wrong while loading more leagues.");
            btnLoadMore.disabled = false;
            btnLoadMore.innerText = "Load more leagues";
        }
    }
}

function mostrarModalConfirmacion(titulo, nombreLigaOriginal, accionConfirmar) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Inyectamos el formulario usando las clases CSS de tu login/register (.form-group)
    overlay.innerHTML = `
        <div class="modal-content auth-container" style="animation: modalFadeIn 0.2s ease; text-align: left; max-width: 420px;">
            <h3 style="margin-top: 0; color: white; font-size: 20px; text-align: center;">${titulo}</h3>
            <p style="color: #ff6b6b; margin-bottom: 20px; font-size: 14px; text-align: center;">
                This action is permanent. Please fill in the fields to confirm.
            </p>
            
            <div class="auth-form">
                <div class="form-group">
                    <label>Type the league name (<strong>${nombreLigaOriginal}</strong>):</label>
                    <input type="text" id="confirm-league-name" placeholder="League name" autocomplete="off">
                </div>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Your account password:</label>
                    <input type="password" id="confirm-user-password" placeholder="••••••••">
                </div>

                <div id="modal-error-msg" class="error-msg oculto" style="margin-bottom: 10px;"></div>

                <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="btn-modal-cancel" class="btn-nav">Cancel</button>
                    <button id="btn-modal-confirm" class="btn-danger">Delete Permanently</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const inputName = overlay.querySelector('#confirm-league-name');
    const inputPassword = overlay.querySelector('#confirm-user-password');
    const errorBox = overlay.querySelector('#modal-error-msg');

    overlay.querySelector('#btn-modal-cancel').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#btn-modal-confirm').addEventListener('click', async () => {
        // 1. Validar que el nombre de la liga coincida en el frontend antes de gastar recursos de red
        if (inputName.value.trim() !== nombreLigaOriginal) {
            errorBox.textContent = "The league name does not match.";
            errorBox.classList.remove('oculto');
            return;
        }

        if (!inputPassword.value) {
            errorBox.textContent = "Password is required.";
            errorBox.classList.remove('oculto');
            return;
        }

        errorBox.classList.add('oculto');
        
        // 2. Si pasa el filtro, enviamos la contraseña introducida a la función real
        const exito = await accionConfirmar(inputPassword.value);
        if (exito) overlay.remove();
    });
}

// 🔄 MODIFICADO: Ahora llaman a la modal personalizada en vez de al confirm() del sistema
function eliminarLiga(id) {
    // Buscamos la tarjeta en el DOM para extraer el nombre exacto de la liga que está en el <h3>
    const tarjeta = document.querySelector(`.league-card[data-id="${id}"]`);
    const nombreLiga = tarjeta ? tarjeta.querySelector('h3').textContent.trim() : "";

    mostrarModalConfirmacion(
        "Delete League", 
        nombreLiga, 
        async (passwordIntroducida) => { // Recibe la contraseña desde la modal
            try {
                const response = await fetch(`/api/leagues/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // 🆕 Enviamos la contraseña en el body
                    body: JSON.stringify({ password: passwordIntroducida }) 
                });

                const data = await response.json();

                if (response.ok) {
                    mostrarAlertaPersonalizada("Success", data.message || "League deleted successfully!", true);
                    currentOffset = 0;
                    await fetchLeagues(); 
                    return true; // Para cerrar la modal de confirmación
                } else {
                    // Si el backend dice que la contraseña es incorrecta, la modal NO se cierra y muestra el error
                    const errorBox = document.getElementById('modal-error-msg');
                    if (errorBox) {
                        errorBox.textContent = `❌ ${data.error}`;
                        errorBox.classList.remove('oculto');
                    }
                    return false; 
                }
            } catch (error) {
                console.error("Error deleting league:", error);
                mostrarAlertaPersonalizada("Connection Error", "Could not connect to the server.", false);
                return false;
            }
        }
    );
}

// Leave functionality removed: non-creators see no action button.

function mostrarAlertaPersonalizada(titulo, mensaje, esExito = true) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Aplicamos estilos dinámicos al borde superior según sea éxito o error
    const colorBorde = esExito ? '#4caf50' : '#ff6b6b';

    overlay.innerHTML = `
        <div class="modal-content auth-container" style="animation: modalFadeIn 0.2s ease; border-top: 4px solid ${colorBorde};">
            <h3 style="margin-top: 0; color: white; font-size: 20px;">${titulo}</h3>
            <p style="color: #ccc; margin: 15px 0 25px 0; font-size: 15px;">${mensaje}</p>
            <div style="text-align: center;">
                <button id="btn-alert-close" class="btn-auth" style="margin-top: 0; padding: 10px 24px; font-size: 14px; background-color: ${colorBorde}; color: #121212;">
                    Accept
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Al hacer clic en aceptar, simplemente removemos la alerta de la pantalla
    overlay.querySelector('#btn-alert-close').addEventListener('click', () => {
        overlay.remove();
    });
}