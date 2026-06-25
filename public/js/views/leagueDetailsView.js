// src/js/views/leagueDetailsView.js

export async function renderLeagueDetails(leagueId) {
    const contenedor = document.getElementById('vista-principal');
    
    // Estructura de carga
    contenedor.innerHTML = `<div class="hola-texto">Loading league details...</div>`;

    try {
        const respuesta = await fetch(`/api/leagues/${leagueId}/details`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || 'Error loading league details');
        }

        const { league, participants, isCreator } = datos;

        if (league.in_progress) {
            // ... (Código de bloqueo si está en progreso - se mantiene igual)
            contenedor.innerHTML = `<div class="auth-container"><h2>${league.name}</h2><div class="error-msg">In progress.</div></div>`;
            return;
        }

        const currentUserText = document.getElementById('btn-edit-profile')?.textContent || '';

        participants.sort((a, b) => a.username.localeCompare(b.username, 'es', { sensitivity: 'base' }));

        contenedor.innerHTML = `
            <div class="auth-container" style="max-width: 500px;">
                <h2 style="margin-bottom: 5px;">${league.name}</h2>
                <p style="text-align: center; color: #4caf50; font-size: 14px; margin-top: 0; margin-bottom: 20px;">
                    📌 Waiting for tournament to start
                </p>

                <div class="form-group">
                    <label style="font-weight: bold; color: white; margin-bottom: 10px;">
                        Participants (${participants.length})
                    </label>
                    
                    <ul id="participants-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                        ${participants.length === 0 
                            ? '<li style="color: #aaa; font-style: italic; text-align: center; padding: 10px;">No players joined yet.</li>' 
                            : participants.map((p, index) => {
                                const showKickButton = isCreator && p.username !== currentUserText;

                                return `
                                <li style="background-color: #242424; border: 1px solid #333; padding: 10px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="font-size: 12px; color: #666; margin-right: 5px;">#${index + 1}</span>
                                        <span style="font-weight: 500; color: #e0e0e0;">${p.username}</span>
                                        ${p.username === currentUserText ? '<span style="font-size: 11px; color: #4caf50; margin-left: 5px;">(You)</span>' : ''}
                                    </div>
                                    
                                    ${showKickButton ? `
                                        <button class="btn-kick" data-user-id="${p.user_id}" data-username="${p.username}" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,107,107,0.1)'" onmouseout="this.style.background='none'">
                                            ❌
                                        </button>
                                    ` : ''}
                                </li>
                                `;
                            }).join('')
                        }
                    </ul>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button id="btn-back-list" class="btn-auth" style="background-color: #242424; color: white; border: 1px solid #444; margin: 0; flex: 1;">
                        Back to Dashboard
                    </button>
                    
                    ${isCreator ? `
                        <button id="btn-start-league" class="btn-auth" style="margin: 0; flex: 1; background-color: #4caf50; border-color: #4caf50; color: white;">
                            Start League
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.getElementById('btn-back-list').addEventListener('click', () => {
            window.history.pushState({}, '', '/hola');
            window.dispatchEvent(new Event('popstate'));
        });

        // ESCUCHA DE EVENTOS PARA EXPULSAR (Modificada para usar la modal)
        if (isCreator) {
            document.getElementById('participants-list').addEventListener('click', async (e) => {
                const kickBtn = e.target.closest('.btn-kick');
                if (!kickBtn) return;

                const userIdToKick = kickBtn.getAttribute('data-user-id');
                const usernameToKick = kickBtn.getAttribute('data-username');

                // 🔥 CAMBIO AQUÍ 🔥
                // Reemplazamos confirm() por nuestra función personalizada y asíncrona
                const mensaje = `Are you sure you want to remove <strong>${usernameToKick}</strong> from the league?`;
                const confirmado = await mostrarConfirmacionModal('Kick Player', mensaje);

                // La ejecución se pausa aquí hasta que el usuario pulse en la modal
                if (confirmado) {
                    try {
                        const res = await fetch('/api/leagues/kick', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leagueId, userIdToKick })
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Error kicking player');

                        renderLeagueDetails(leagueId); // Recargar la vista

                    } catch (err) {
                        alert(err.message); // O usa una modal de error bonita también
                    }
                }
            });
            document.getElementById('btn-start-league').addEventListener('click', async () => {
                const confirmado = await mostrarConfirmacionModal(
                    'Start Tournament', 
                    'Are you sure you want to start the league? No more players will be able to join.'
                );

                if (confirmado) {
                    try {
                        const res = await fetch(`/api/leagues/${leagueId}/start`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' }
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Error starting league');

                        // Refrescamos para aplicar el cambio de estado
                        window.history.pushState({}, '', '/hola');
                        window.dispatchEvent(new Event('popstate'));
                        return;

                    } catch (err) {
                        alert(err.message);
                    }
                }
            });
        }
    } catch (error) {
        // ... (Manejo de errores - se mantiene igual)
    }
}

// --- 🆕 FUNCIÓN AUXILIAR DE LA MODAL (Lógica de Promesas) ---
function mostrarConfirmacionModal(titulo, mensaje) {
    return new Promise((resolve) => {
        // Seleccionamos los elementos de la modal (que añadimos al index.html)
        const modal = document.getElementById('custom-confirm-modal');
        const tituloEl = document.getElementById('confirm-modal-title');
        const mensajeEl = document.getElementById('confirm-modal-message');
        const btnAceptar = document.getElementById('confirm-modal-accept');
        const btnCancelar = document.getElementById('confirm-modal-cancel');

        // 1. Rellenamos el texto dinámico
        tituloEl.textContent = titulo;
        mensajeEl.innerHTML = mensaje; // Usamos innerHTML por si queremos negritas

        // 2. Mostramos la modal quitando la clase 'oculto'
        modal.classList.remove('oculto');

        // 3. Definimos funciones de limpieza para los eventos (para evitar duplicados)
        const limpiarEventos = () => {
            btnAceptar.removeEventListener('click', payloadAceptar);
            btnCancelar.removeEventListener('click', payloadCancelar);
            modal.classList.add('oculto'); // Ocultar al terminar
        };

        // 4. Definimos qué pasa al pulsar los botones (resuelven la promesa)
        const payloadAceptar = () => {
            limpiarEventos();
            resolve(true); // El usuario confirmó
        };

        const payloadCancelar = () => {
            limpiarEventos();
            resolve(false); // El usuario canceló
        };

        // 5. Añadimos los escuchas de clicks
        btnAceptar.addEventListener('click', payloadAceptar);
        btnCancelar.addEventListener('click', payloadCancelar);
    });
}