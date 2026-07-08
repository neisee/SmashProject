import { renderActiveLeagueDetails } from './activeLeagueDetailsView.js';

// Función auxiliar para evitar inyecciones XSS en el HTML
export function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

export async function renderLeagueDetails(leagueId) {
    const contenedor = document.getElementById('vista-principal');
    
    // Estructura de carga
    contenedor.innerHTML = `<div class="hola-texto">Loading league details...</div>`;

    try {
        const respuesta = await fetch(`/api/leagues/${leagueId}/details?_=${new Date().getTime()}`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || 'Error loading league details');
        }

        const { league, participants, isCreator, currentUsername } = datos;

        // Si el backend no devuelve currentUsername, usamos el fallback del DOM de forma segura
        const currentUserText = currentUsername || document.getElementById('btn-edit-profile')?.textContent || '';

        if (league.in_progress) {
            // 🔥 Pasamos un callback como tercer argumento para romper la dependencia circular
            renderActiveLeagueDetails(leagueId, datos, () => renderLeagueDetails(leagueId)); 
            return;
        }

        contenedor.innerHTML = `
            <div class="auth-container" style="max-width: 500px;">
                <h2 style="margin-bottom: 5px;">${escapeHTML(league.name)}</h2>
                <p style="text-align: center; color: #4caf50; font-size: 14px; margin-top: 0; margin-bottom: 20px;">
                    Waiting for tournament to start
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
                                        <span style="font-weight: 500; color: #e0e0e0;">${escapeHTML(p.username)}</span>
                                        ${p.username === currentUserText ? '<span style="font-size: 11px; color: #4caf50; margin-left: 5px;">(You)</span>' : ''}
                                    </div>
                                    
                                    ${showKickButton ? `
                                        <button class="btn-kick" data-user-id="${p.user_id}" data-username="${escapeHTML(p.username)}" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,107,107,0.1)'" onmouseout="this.style.background='none'">
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

        if (isCreator) {
            document.getElementById('participants-list').addEventListener('click', async (e) => {
                const kickBtn = e.target.closest('.btn-kick');
                if (!kickBtn) return;

                const userIdToKick = kickBtn.getAttribute('data-user-id');
                const usernameToKick = kickBtn.getAttribute('data-username');

                const mensaje = `Are you sure you want to remove <strong>${escapeHTML(usernameToKick)}</strong> from the league?`;
                const confirmado = await mostrarConfirmacionModal('Kick Player', mensaje);

                if (confirmado) {
                    try {
                        const res = await fetch('/api/leagues/kick', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leagueId, userIdToKick })
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Error kicking player');

                        renderLeagueDetails(leagueId);

                    } catch (err) {
                        await mostrarErrorModal('Error Removing Player', err.message);
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

                        window.history.pushState({}, '', '/hola');
                        window.dispatchEvent(new Event('popstate'));
                        return;

                    } catch (err) {
                        await mostrarErrorModal('Error Starting Tournament', err.message);
                    }
                }
            });
        }
    } catch (error) {
        await mostrarErrorModal('Loading Error', error.message);
        contenedor.innerHTML = `<div class="auth-container"><div class="error-msg">Could not load league info.</div></div>`;
    }
}

// --- MODALES DE CONFIRMACIÓN Y ERROR ---
export function mostrarConfirmacionModal(titulo, mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const tituloEl = document.getElementById('confirm-modal-title');
        const mensajeEl = document.getElementById('confirm-modal-message');
        const btnAceptar = document.getElementById('confirm-modal-accept');
        const btnCancelar = document.getElementById('confirm-modal-cancel');

        tituloEl.textContent = titulo;
        mensajeEl.innerHTML = mensaje;
        modal.classList.remove('oculto');

        const limpiarEventos = () => {
            btnAceptar.removeEventListener('click', payloadAceptar);
            btnCancelar.removeEventListener('click', payloadCancelar);
            modal.classList.add('oculto');
        };

        const payloadAceptar = () => {
            limpiarEventos();
            resolve(true);
        };

        const payloadCancelar = () => {
            limpiarEventos();
            resolve(false);
        };

        btnAceptar.addEventListener('click', payloadAceptar);
        btnCancelar.addEventListener('click', payloadCancelar);
    });
}

export function mostrarErrorModal(titulo, mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const tituloEl = document.getElementById('confirm-modal-title');
        const mensajeEl = document.getElementById('confirm-modal-message');
        const btnAceptar = document.getElementById('confirm-modal-accept');
        const btnCancelar = document.getElementById('confirm-modal-cancel');

        tituloEl.textContent = titulo;
        tituloEl.style.color = '#ff6b6b';
        mensajeEl.innerHTML = mensaje;
        btnAceptar.textContent = 'Aceptar';
        btnCancelar.style.display = 'none';
        modal.classList.remove('oculto');

        const limpiarEventos = () => {
            btnAceptar.removeEventListener('click', payloadAceptar);
            modal.classList.add('oculto');
            btnCancelar.style.display = 'inline-block';
            tituloEl.style.color = ''; 
            btnAceptar.textContent = 'Confirm'; 
        };

        const payloadAceptar = () => {
            limpiarEventos();
            resolve();
        };

        btnAceptar.addEventListener('click', payloadAceptar);
    });
}