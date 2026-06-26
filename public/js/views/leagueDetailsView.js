// src/js/views/leagueDetailsView.js

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

        const { league, participants, isCreator } = datos;

        if (league.in_progress) {
            // 🔥 Respetamos el orden oficial exacto que viene del servidor con las miniligas
            renderActiveLeagueDetails(leagueId, datos); 
            return;
        }

        const currentUserText = document.getElementById('btn-edit-profile')?.textContent || '';

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

        if (isCreator) {
            document.getElementById('participants-list').addEventListener('click', async (e) => {
                const kickBtn = e.target.closest('.btn-kick');
                if (!kickBtn) return;

                const userIdToKick = kickBtn.getAttribute('data-user-id');
                const usernameToKick = kickBtn.getAttribute('data-username');

                const mensaje = `Are you sure you want to remove <strong>${usernameToKick}</strong> from the league?`;
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

// --- MODALES DE CONFIRMACIÓN Y ERROR (Sin cambios) ---
function mostrarConfirmacionModal(titulo, mensaje) {
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

function mostrarErrorModal(titulo, mensaje) {
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

// --- VISTA LIVE ORDENADA DIRECTAMENTE POR TU BACKEND RECURSIVO ---
export function renderActiveLeagueDetails(leagueId, datos) {
    const contenedor = document.getElementById('vista-principal');
    const { league, participants, nextMatch } = datos;

    const currentUserText = document.getElementById('btn-edit-profile')?.textContent || '';

    let tarjetaPartidoHTML = `
        <div style="background-color: #1f1f1f; border: 1px dashed #444; border-radius: 8px; padding: 15px; text-align: center;">
            <p style="color: #aaa; font-style: italic; font-size: 14px; margin: 0;">
                🕒 No upcoming matches found or you are not participating in this league.
            </p>
        </div>
    `;

    // Procesamos el partido si existe
    if (nextMatch) {
        // 1. Buscamos los nombres reales de la DB basándonos estrictamente en el orden del partido
        const p1Obj = participants.find(p => p.user_id === nextMatch.player1);
        const p2Obj = participants.find(p => p.user_id === nextMatch.player2);

        const p1Name = p1Obj ? p1Obj.username : 'Unknown';
        const p2Name = p2Obj ? p2Obj.username : 'Unknown';

        // 2. Añadimos etiquetas visuales "(You)" para saber quién es quién, sin alterar el orden del HTML
        const p1Label = (p1Name === currentUserText) ? ' <span style="color:#4caf50; font-size:11px;">(You)</span>' : '';
        const p2Label = (p2Name === currentUserText) ? ' <span style="color:#4caf50; font-size:11px;">(You)</span>' : '';

        tarjetaPartidoHTML = `
            <div style="background: linear-gradient(135deg, #2b2b2b 0%, #1f1f1f 100%); border: 2px solid #ff6b6b; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <span style="background-color: #ff6b6b; color: #121212; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 20px; text-transform: uppercase;">
                    Round ${nextMatch.round_number} • Match Center
                </span>
                
                <div style="display: flex; justify-content: center; align-items: flex-start; gap: 20px; margin-top: 15px;">
                    <div style="flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <span style="font-size: 16px; font-weight: bold; color: #e0e0e0;">${p1Name}${p1Label}</span>
                        <input type="number" id="score-player1" min="0" max="99" placeholder="Lives" 
                               style="width: 60px; background-color: #121212; border: 1px solid #444; color: white; padding: 6px; border-radius: 4px; text-align: center; font-size: 14px; font-weight: bold; margin-top: 4px; appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none;">
                    </div>
                    
                    <div style="font-size: 18px; font-weight: bold; color: #ff6b6b; font-style: italic; margin-top: 4px;">VS</div>
                    
                    <div style="flex: 1; text-align: left; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;">
                        <span style="font-size: 16px; font-weight: bold; color: #e0e0e0;">${p2Name}${p2Label}</span>
                        <input type="number" id="score-player2" min="0" max="99" placeholder="Lives" 
                               style="width: 60px; background-color: #121212; border: 1px solid #444; color: white; padding: 6px; border-radius: 4px; text-align: center; font-size: 14px; font-weight: bold; margin-top: 4px; appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none;">
                    </div>
                </div>
                
                <button id="btn-post-result" 
                        data-p1-id="${nextMatch.player1}" 
                        data-p2-id="${nextMatch.player2}"
                        style="margin-top: 18px; width: 100%; background-color: #ff6b6b; color: #121212; border: none; padding: 10px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: background 0.2s;">
                    🚀 Post Result
                </button>
            </div>
        `;
    } else {
        // Si nextMatch explícitamente llegó null del backend pero el jugador está en la lista
        const esParticipante = participants.some(p => p.username === currentUserText);
        if (esParticipante) {
            tarjetaPartidoHTML = `
                <div style="background-color: #1a231a; border: 1px dashed #4caf50; border-radius: 8px; padding: 15px; text-align: center;">
                    <p style="color: #4caf50; font-weight: 500; margin: 0; font-size: 14px;">
                        ✅ You have played all your available matches for now!
                    </p>
                </div>
            `;
        }
    }

    // Inyectamos la estructura completa en el DOM
    contenedor.innerHTML = `
        <style>
            #score-player1::-webkit-outer-spin-button,
            #score-player1::-webkit-inner-spin-button,
            #score-player2::-webkit-outer-spin-button,
            #score-player2::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            #score-player1, #score-player2 {
                -moz-appearance: textfield;
            }
        </style>

        <div class="auth-container" style="max-width: 580px;">
            <h2 style="margin-bottom: 5px;">${league.name}</h2>
            <p style="text-align: center; color: #ff6b6b; font-size: 14px; margin-top: 0; margin-bottom: 25px; font-weight: bold;">
                🔴 League in Progress (Tournament Live)
            </p>

            <div style="margin-bottom: 25px;">
                <label style="font-weight: bold; color: white; margin-bottom: 10px; display: block;">
                    Match Center
                </label>
                ${tarjetaPartidoHTML}
            </div>

            <div class="form-group">
                <label style="font-weight: bold; color: white; margin-bottom: 10px; display: block;">
                    Official Standings (${participants.length} Players)
                </label>
                
                <ul id="active-participants-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                    ${participants.map((p, index) => {
                        const diffVidas = (p.lives_won || 0) - (p.lives_against || 0);
                        const stringVidas = diffVidas >= 0 ? `+${diffVidas}` : `${diffVidas}`;
                        const colorVidas = diffVidas >= 0 ? '#4feb52' : '#ff6b6b';
                        const esUsuarioActual = p.username === currentUserText;

                        return `
                        <li style="background-color: ${esUsuarioActual ? '#1e291e' : '#242424'}; border: 1px solid ${esUsuarioActual ? '#4caf50' : '#333'}; padding: 10px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-size: 13px; color: #ff6b6b; margin-right: 8px; font-weight: bold;">#${index + 1}</span>
                                <span style="font-weight: 500; color: ${esUsuarioActual ? '#4caf50' : '#e0e0e0'};">${p.username}</span>
                                ${esUsuarioActual ? '<span style="font-size: 11px; color: #4caf50; margin-left: 5px;">(You)</span>' : ''}
                            </div>
                            <div style="font-size: 12px; color: #aaa; display: flex; gap: 14px; align-items: center;">
                                <span>Record: <b style="color: white; font-size: 13px;">${p.wins || 0}-${p.losses || 0}</b></span>
                                <span>Lives: <b style="color: ${colorVidas}; font-size: 13px;">${stringVidas}</b></span>
                            </div>
                        </li>
                        `;
                    }).join('')}
                </ul>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="btn-back-active" class="btn-auth" style="background-color: #242424; color: white; border: 1px solid #444; margin: 0; flex: 1;">
                    Back to Dashboard
                </button>
            </div>
        </div>
    `;

    document.getElementById('btn-back-active').addEventListener('click', () => {
        window.history.pushState({}, '', '/hola');
        window.dispatchEvent(new Event('popstate'));
    });

    const btnPostResult = document.getElementById('btn-post-result');
    if (btnPostResult) {
        btnPostResult.addEventListener('click', async () => {
            const livesLeftInput = document.getElementById('score-player1').value;  // El de la izquierda (Tú)
            const livesRightInput = document.getElementById('score-player2').value; // El de la derecha (Rival)

            if (livesLeftInput === '' || livesRightInput === '') {
                await mostrarErrorModal('Missing Scores', 'Please enter the score/lives for both players.');
                return;
            }

            const confirmado = await mostrarConfirmacionModal('Submit Result', 'Are you sure you want to save this score?');
            if (!confirmado) return;

            // 🎯 AQUÍ ESTÁ EL TRUCO MÁGICO:
            // Recuperamos los IDs reales que guardamos en los atributos data-* del botón
            const p1IdIdDb = btnPostResult.getAttribute('data-p1-id'); // El Player 1 real en la DB
            const p2IdIdDb = btnPostResult.getAttribute('data-p2-id'); // El Player 2 real en la DB

            // Averiguamos tu ID real en base a la lista de participantes
            const currentUserObj = participants.find(p => p.username === currentUserText);
            const currentUserId = currentUserObj ? currentUserObj.user_id : null;

            let finalLivesP1, finalLivesP2;

            // Si TÚ eres el player1 en la base de datos...
            if (Number(currentUserId) === Number(p1IdIdDb)) {
                finalLivesP1 = parseInt(livesLeftInput, 10);  // Tus vidas van al Player 1
                finalLivesP2 = parseInt(livesRightInput, 10); // Las del rival van al Player 2
            } else {
                // Si TÚ eres el player2 en la base de datos... ¡Los cruzamos!
                finalLivesP1 = parseInt(livesRightInput, 10); // Las del rival (derecha) van al Player 1
                finalLivesP2 = parseInt(livesLeftInput, 10);  // Tus vidas (izquierda) van al Player 2
            }

            try {
                const res = await fetch(`/api/leagues/${leagueId}/matches/result`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        player1Id: p1IdIdDb,
                        player2Id: p2IdIdDb,
                        livesPlayer1: finalLivesP1, // Enviados correctamente según la DB
                        livesPlayer2: finalLivesP2  // Enviados correctamente según la DB
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error saving result');

                // Recargamos la vista
                renderLeagueDetails(leagueId);

            } catch (err) {
                await mostrarErrorModal('Submission Error', err.message);
            }
        });
    }
}