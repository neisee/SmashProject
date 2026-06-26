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
                🕒 No upcoming matches found
            </p>
        </div>
    `;

    // Procesamos el partido si existe
    if (nextMatch) {
        const esByeRound = (nextMatch.player1 === null || nextMatch.player2 === null);

        if (esByeRound) {
            // --- TARJETA ESPECIAL: JORNADA DE DESCANSO (BYE ROUND) ---
            tarjetaPartidoHTML = `
                <div style="background: linear-gradient(135deg, #1f2421 0%, #161a18 100%); border: 2px dashed #4caf50; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <span style="background-color: #4caf50; color: #121212; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 20px; text-transform: uppercase;">
                        Round ${nextMatch.round_number} • Bye Round
                    </span>
                    
                    <div style="margin-top: 20px; margin-bottom: 20px;">
                        <h3 style="color: #4caf50; margin: 0 0 5px 0; font-size: 18px;">🏠 It's your Rest Round!</h3>
                        <p style="color: #aaa; font-size: 13px; margin: 0; line-height: 1.4;">
                            You don't have an opponent assigned for this round.<br>
                            You can advance directly to the next round.
                        </p>
                    </div>
                    
                    <button id="btn-skip-bye" 
                            data-p1-id="${nextMatch.player1 || ''}" 
                            data-p2-id="${nextMatch.player2 || ''}"
                            style="width: 100%; background-color: #4caf50; color: #121212; border: none; padding: 10px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: background 0.2s;"
                            onmouseover="this.style.backgroundColor='#66bb6a'" 
                            onmouseout="this.style.backgroundColor='#4caf50'">
                        Next Round ➡️
                    </button>
                </div>
            `;
        } else {
            // --- TARJETA NORMAL: ENFRENTAMIENTO CONTRA RIVAL REAL (Izquierda = P1 DB, Derecha = P2 DB) ---
            const p1Obj = participants.find(p => p.user_id === nextMatch.player1);
            const p2Obj = participants.find(p => p.user_id === nextMatch.player2);

            const p1Name = p1Obj ? p1Obj.username : 'Unknown';
            const p2Name = p2Obj ? p2Obj.username : 'Unknown';

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
                        
                        // 👑 ESTILOS EXCLUSIVOS PARA EL TOP DE LA LIGA (AMARILLO #1, VERDE FUERTE #2) 🟡
                        const esVerdeTop = (index === 0 || index === 1);  // Posiciones 1 y 2
                        const esAmarilloTop = (index >= 2 && index <= 4); // Posiciones 3, 4 y 5
                        const esCuatroUltimos = (index >= participants.length - 4); // Últimos 4
                        
                        // Protección anti-solapamiento para ligas pequeñas
                        const esRojoFinal = esCuatroUltimos && !esVerdeTop && !esAmarilloTop;

                        // Definimos el color del texto del número "#X"
                        const colorRankingText = esVerdeTop ? '#00e676' : (esAmarilloTop ? '#ffd700' : (esRojoFinal ? '#ff3333' : '#ff6b6b'));
                        
                        // Definimos el color del nombre del jugador
                        const colorNombre = esVerdeTop ? '#00e676' : (esAmarilloTop ? '#ffd700' : (esRojoFinal ? '#ff3333' : (esUsuarioActual ? '#4caf50' : '#e0e0e0')));
                        
                        // Prefijo de texto limpio sin coronas ni medallas
                        const prefijoRank = `#${index + 1}`;
                        
                        // Ponemos en negrita el texto destacado (Tops y últimos)
                        const fuentePeso = (esVerdeTop || esAmarilloTop || esRojoFinal) ? 'bold' : '500';
                        
                        // Color para el borde de la caja
                        const colorBorde = esVerdeTop ? '#00e676' : (esAmarilloTop ? '#ffd700' : (esRojoFinal ? '#ff3333' : (esUsuarioActual ? '#4caf50' : '#333')));
                        return `
                        <li style="background-color: ${esUsuarioActual ? '#1e291e' : '#242424'}; border: 1px solid ${colorBorde}; padding: 10px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-size: 13px; color: ${colorRankingText}; margin-right: 8px; font-weight: bold;">${prefijoRank}</span>
                                <span style="font-weight: ${fuentePeso}; color: ${colorNombre};">${p.username}</span>
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
            const livesP1 = document.getElementById('score-player1').value; // Izquierda (P1 DB)
            const livesP2 = document.getElementById('score-player2').value; // Derecha (P2 DB)

            if (livesP1 === '' || livesP2 === '') {
                await mostrarErrorModal('Missing Scores', 'Please enter the score/lives for both players.');
                return;
            }

            const confirmado = await mostrarConfirmacionModal('Submit Result', 'Are you sure you want to save this score?');
            if (!confirmado) return;

            try {
                const res = await fetch(`/api/leagues/${leagueId}/matches/result`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        player1Id: btnPostResult.getAttribute('data-p1-id'),
                        player2Id: btnPostResult.getAttribute('data-p2-id'),
                        livesPlayer1: parseInt(livesP1, 10), // Envío directo mapeado con la vista estricta
                        livesPlayer2: parseInt(livesP2, 10)  // Envío directo mapeado con la vista estricta
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error saving result');

                // Llamamos a la función principal para que pida los nuevos datos al servidor y repinte
                if (typeof renderLeagueDetails === 'function') {
                    renderLeagueDetails(leagueId);
                } else {
                    window.location.reload(); // Copia de seguridad si no está global
                }

            } catch (err) {
                await mostrarErrorModal('Submission Error', err.message);
            }
        });
    }

    const btnSkipBye = document.getElementById('btn-skip-bye');
    if (btnSkipBye) {
        btnSkipBye.addEventListener('click', async () => {
            try {
                const res = await fetch(`/api/leagues/${leagueId}/matches/result`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        player1Id: btnSkipBye.getAttribute('data-p1-id') || null,
                        player2Id: btnSkipBye.getAttribute('data-p2-id') || null,
                        livesPlayer1: 0,
                        livesPlayer2: 0
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error skipping bye round');

                // Llamamos a la función principal para que pida los nuevos datos al servidor y repinte
                if (typeof renderLeagueDetails === 'function') {
                    renderLeagueDetails(leagueId);
                } else {
                    window.location.reload(); // Copia de seguridad si no está global
                }

            } catch (err) {
                await mostrarErrorModal('Error advancing round', err.message);
            }
        });
    }
}