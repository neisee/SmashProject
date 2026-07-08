import { mostrarConfirmacionModal, mostrarErrorModal, escapeHTML } from './leagueDetailsView.js';

export async function renderEditPlayedMatches(leagueId) {
    const contenedor = document.getElementById('vista-principal');

    const fetchCharacterButtonImage = async (buttonElement, characterId) => {
        if (!buttonElement || !characterId) return;

        try {
            const resp = await fetch(`/api/characters/${characterId}`);
            const data = await resp.json();
            if (!resp.ok || !data.imageUrl) {
                console.warn('Error al cargar imagen de personaje:', data);
                buttonElement.textContent = '👤 Select Character';
                return;
            }

            buttonElement.innerHTML = `
                <span style="display:flex; align-items:center; justify-content:center; gap:10px; width:100%;">
                    <img src="${data.imageUrl}" alt="Character ${characterId}" style="height:24px; width:auto; border-radius:4px; box-shadow: 0 0 8px rgba(0,0,0,0.4);">
                    <span style="font-size: 14px; font-weight: bold; color: white;">Change</span>
                </span>
            `;
        } catch (err) {
            console.error('Error fetching selected character image:', err);
            buttonElement.textContent = 'Select Character';
        }
    };

    try {
        // 1. Petición para pillar los partidos de esta liga
        const res = await fetch(`/api/leagues/${leagueId}/matches`);
        const datos = await res.json();
        if (!res.ok) throw new Error(datos.error || 'Error al cargar partidos');

        // Filtrar solo los partidos que YA tienen resultado (jugados)
        const partidosJugados = datos.matches.filter(m => m.lives_player1 !== null && m.lives_player2 !== null);

        if (partidosJugados.length === 0) {
            contenedor.innerHTML = `
                <div class="auth-container" style="max-width: 580px; text-align: center;">
                    <h2>Edit Played Matches</h2>
                    <p style="color: #aaa; margin: 20px 0;">No played matches found in this league yet.</p>
                    <button id="btn-back-to-league" class="btn-auth" style="background-color: #242424; color: white;">Volver a la Liga</button>
                </div>
            `;
            document.getElementById('btn-back-to-league').addEventListener('click', () => navegarALiga(leagueId));
            return;
        }

        // 2. Renderizar la lista de partidos editables
        contenedor.innerHTML = `
            <div class="auth-container" style="max-width: 580px;">
                <h2 style="margin-bottom: 20px;">⚙️ Edit Played Matches</h2>
                
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    ${partidosJugados.map((m, index) => {
                        const usuarioActualEsP1 = datos.currentUserId === m.player1;
                        const selectedCharacterId = usuarioActualEsP1 ? m.character1 : m.character2;
                        const botonTexto = selectedCharacterId ? 'Loading selected character...' : '👤 Select Character';
                        
                        // 🛑 DETECTAR SI ES BYE ROUND (Si alguno de los dos IDs es nulo o el string 'null')
                        const esBye = (!m.player1 || m.player1 === 'null' || !m.player2 || m.player2 === 'null');

                        return `
                            <div class="match-edit-card" style="background-color: #242424; border: 1px solid ${esBye ? '#333' : '#444'}; padding: 15px; border-radius: 8px; opacity: ${esBye ? '0.6' : '1'};">
                                <div style="text-align: center; color: #ff6b6b; font-size: 12px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">
                                    Round ${m.round_number} ${esBye ? 'Bye Round' : ''}
                                </div>
                                <div style="display: flex; justify-content: center; align-items: center; gap: 15px;">
                                    
                                    <div style="flex: 1; text-align: right;">
                                        <span style="color: white; font-weight: bold; display: block; margin-bottom: 4px;">${escapeHTML(m.player1_name || 'Bye')}</span>
                                        <input type="number" id="edit-p1-${index}" value="${m.lives_player1}" min="0" max="99" 
                                               ${esBye ? 'disabled' : ''} 
                                               style="width: 55px; background: #121212; border: 1px solid #555; color: ${esBye ? '#666' : 'white'}; text-align: center; padding: 4px; border-radius: 4px; font-weight: bold;">
                                    </div>

                                    <div style="color: #ff6b6b; font-weight: bold; font-style: italic;">VS</div>

                                    <div style="flex: 1; text-align: left;">
                                        <span style="color: white; font-weight: bold; display: block; margin-bottom: 4px;">${escapeHTML(m.player2_name || 'Bye')}</span>
                                        <input type="number" id="edit-p2-${index}" value="${m.lives_player2}" min="0" max="99" 
                                               ${esBye ? 'disabled' : ''} 
                                               style="width: 55px; background: #121212; border: 1px solid #555; color: ${esBye ? '#666' : 'white'}; text-align: center; padding: 4px; border-radius: 4px; font-weight: bold;">
                                    </div>

                                </div>
                                
                                ${!esBye ? `
                                    <button class="btn-select-character" data-index="${index}" data-match-id="${m.id}" data-character-id="${selectedCharacterId || ''}"
                                            style="margin-top: 12px; width: 100%; background: #242424; color: #ff8b0f; border: 1px solid #ff8b0f; padding: 8px; font-weight: bold; border-radius: 4px; cursor: pointer;">
                                        ${botonTexto}
                                    </button>
                                    <button class="btn-save-match" data-index="${index}" data-p1="${m.player1}" data-p2="${m.player2}"
                                            style="margin-top: 10px; width: 100%; background: #4caf50; color: #121212; border: none; padding: 6px; font-weight: bold; border-radius: 4px; cursor: pointer;">
                                        Save Match Result
                                    </button>
                                ` : `
                                    <div style="margin-top: 12px; text-align: center; color: #666; font-size: 12px; font-style: italic;">
                                        Match locked (Rest Round)
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>

                <button id="btn-back-to-league" class="btn-auth" style="background-color: #242424; color: white; margin-top: 20px; width: 100%;">
                    ↩️ Back to League
                </button>
            </div>
        `;

        // 3. Event Listeners para editar el personaje de cada match
        document.querySelectorAll('.btn-select-character').forEach(boton => {
            const characterId = boton.getAttribute('data-character-id');
            if (characterId) {
                fetchCharacterButtonImage(boton, parseInt(characterId, 10));
            }

            boton.addEventListener('click', () => {
                const matchId = boton.getAttribute('data-match-id');
                window.history.pushState({}, '', `/league/${leagueId}/select-character/${matchId}`);
                window.dispatchEvent(new Event('popstate'));
            });
        });

        // 4. Event Listeners para actualizar cada partido individualmente
        document.querySelectorAll('.btn-save-match').forEach(boton => {
            boton.addEventListener('click', async (e) => {
                const idx = e.target.getAttribute('data-index');
                const p1Id = e.target.getAttribute('data-p1');
                const p2Id = e.target.getAttribute('data-p2');
                const livesP1 = document.getElementById(`edit-p1-${idx}`).value;
                const livesP2 = document.getElementById(`edit-p2-${idx}`).value;

                if (livesP1 === '' || livesP2 === '') {
                    await mostrarErrorModal('Error', 'Scores cannot be empty.');
                    return;
                }

                const verificado = await mostrarConfirmacionModal('Update Result', 'Do you want to overwrite this match score?');
                if (!verificado) return;

                try {
                    const resPut = await fetch(`/api/leagues/${leagueId}/matches/result`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            player1Id: p1Id === 'null' ? null : p1Id,
                            player2Id: p2Id === 'null' ? null : p2Id,
                            livesPlayer1: parseInt(livesP1, 10),
                            livesPlayer2: parseInt(livesP2, 10)
                        })
                    });

                    const dataPut = await resPut.json();
                    if (!resPut.ok) throw new Error(dataPut.error || 'Error changing score');

                    // Recargamos la vista actual para reflejar cambios
                    renderEditPlayedMatches(leagueId);

                } catch (err) {
                    await mostrarErrorModal('Error', err.message);
                }
            });
        });

        document.getElementById('btn-back-to-league').addEventListener('click', () => navegarALiga(leagueId));

    } catch (error) {
        await mostrarErrorModal('Loader Error', error.message);
    }
}

function navegarALiga(leagueId) {
    window.history.pushState({}, '', `/league/${leagueId}`);
    window.dispatchEvent(new Event('popstate'));
}