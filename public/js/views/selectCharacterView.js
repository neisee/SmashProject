import { mostrarConfirmacionModal, mostrarErrorModal } from './leagueDetailsView.js';

export async function renderSelectCharacter(leagueId, matchId) {
    const contenedor = document.getElementById('vista-principal');

    // Pedimos al servidor la lista real de imágenes disponibles
    let personajes = [];
    let bloqueados = [];
    try {
        // 1️⃣ Pedimos en paralelo los personajes totales y los personajes bloqueados de tu nuevo endpoint
        const [respPersonajes, respBloqueados] = await Promise.all([
            fetch('/api/characters'),
            fetch(`/api/leagues/${leagueId}/select-character/${matchId}`)
        ]);

        const jsonPersonajes = await respPersonajes.json();
        if (respPersonajes.ok && Array.isArray(jsonPersonajes.images)) {
            personajes = jsonPersonajes.images.map((filename, idx) => ({ id: idx + 1, archivo: filename }));
        }

        // Guardamos los IDs bloqueados que devuelve tu controlador
        if (respBloqueados.ok) {
            bloqueados = await respBloqueados.json(); // Esperamos que sea un array de ints puro
        }
    } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
    }

    // Variable para almacenar el ID del personaje seleccionado actualmente
    let personajeSeleccionadoId = null;

    // 🔥 EL CAMBIO ESTÁ AQUÍ: Forzamos al cuadrado central a ser gigante (92% de tu pantalla)
    contenedor.innerHTML = `
        <div style="
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: 90vw; 
            max-width: 1400px; 
            margin: 40px auto; 
            padding: 25px;
            background-color: #1e1e1e;
            border-radius: 12px;
            border: 1px solid #333;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            box-sizing: border-box;
            z-index: 10;
        ">
            <h2 style="margin-bottom: 5px; text-align: center; color: #fff; font-size: 26px;">Select Your Character</h2>
            <p style="text-align: center; color: #ff8b0f; font-size: 13px; margin-top: 0; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">
                Match Center • Match #${matchId}
            </p>

            <div style="
                display: grid; 
                grid-template-columns: repeat(11, 1fr); 
                grid-template-rows: repeat(7, auto); 
                gap: 10px; 
                background-color: #141414; 
                padding: 16px; 
                border-radius: 8px; 
                border: 1px solid #1a1a1a;
                margin-bottom: 25px;
                width: 100%;
                box-sizing: border-box;
            ">
                ${personajes.map(p => {
                    // 2️⃣ Comprobamos si este personaje específico está bloqueado
                    const isBlocked = bloqueados.includes(p.id);

                    return `
                    <div class="${isBlocked ? 'character-card-blocked' : 'character-card'}" 
                         data-id="${p.id}"
                         style="
                             aspect-ratio: 3 / 2; 
                             background-color: ${isBlocked ? '#0f0f0f' : '#262626'}; 
                             border: 2px solid ${isBlocked ? '#222' : '#444'}; 
                             border-radius: 4px; 
                             cursor: ${isBlocked ? 'not-allowed' : 'pointer'}; 
                             overflow: hidden; 
                             transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                             position: relative;
                             display: flex;
                             align-items: center;
                             justify-content: center;
                             ${isBlocked ? 'pointer-events: none;' : ''} /* 🚫 Evita clicks por completo */
                         "
                         ${!isBlocked ? `
                         onmouseover="if(this.style.borderColor !== 'rgb(255, 139, 15)') { this.style.borderColor='#ff6b6b'; this.style.transform='scale(1.06)'; this.style.zIndex='10'; }"
                         onmouseout="if(this.style.borderColor !== 'rgb(255, 139, 15)') { this.style.borderColor='#444'; this.style.transform='scale(1)'; this.style.zIndex='1'; }"
                         ` : ''}
                    >
                        <img src="/images/Characters/${p.archivo}" 
                             alt="Character ${p.id}" 
                             style="
                                width: 100%; 
                                height: 100%; 
                                object-fit: cover; 
                                pointer-events: none;
                                ${isBlocked ? 'filter: grayscale(100%) brightness(30%);' : ''} /* 🕶️ Foto apagada/oscura */
                             "
                        />
                    </div>
                    `;
                }).join('')}
            </div>

            <div style="display: flex; gap: 16px; max-width: 500px; margin: 0 auto;">
                <button id="btn-back-to-league" class="btn-auth" style="background-color: #2a2a2a; color: white; border: 1px solid #444; margin: 0; flex: 1; padding: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                    ⬅️ Back to League
                </button>
                <button id="btn-lock-character" class="btn-auth" style="background-color: #ff8b0f; color: #121212; border: none; font-weight: bold; margin: 0; flex: 1; padding: 12px; border-radius: 6px; opacity: 0.6; cursor: not-allowed;" disabled>
                    🔒 Lock Character
                </button>
            </div>
        </div>
    `;

    // --- LOGICA DE SELECCIÓN VISUAL ---
    const tarjetas = document.querySelectorAll('.character-card');
    const btnLock = document.getElementById('btn-lock-character');

    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('click', () => {
            tarjetas.forEach(t => {
                t.style.borderColor = '#444';
                t.style.boxShadow = 'none';
                t.style.transform = 'scale(1)';
            });

            tarjeta.style.borderColor = '#ff8b0f';
            tarjeta.style.boxShadow = '0 0 15px rgba(255, 139, 15, 0.6)';
            tarjeta.style.transform = 'scale(1.06)';

            personajeSeleccionadoId = tarjeta.getAttribute('data-id');

            btnLock.disabled = false;
            btnLock.style.opacity = '1';
            btnLock.style.cursor = 'pointer';
        });
    });

    // --- MANEJO DE EVENTOS DE BOTONES ---
    document.getElementById('btn-back-to-league').addEventListener('click', () => {
        window.history.pushState({}, '', `/league/${leagueId}`);
        window.dispatchEvent(new Event('popstate'));
    });

    btnLock.addEventListener('click', async () => {
        if (!personajeSeleccionadoId) return;

        const confirmado = await mostrarConfirmacionModal(
            'Lock Character', 
            `Are you sure you want to select character #${personajeSeleccionadoId} for this match?`
        );
        if (!confirmado) return;

        try {
            const res = await fetch(`/api/leagues/${leagueId}/select-character/${matchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: parseInt(personajeSeleccionadoId, 10)
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error saving character');

            window.history.pushState({}, '', `/league/${leagueId}`);
            window.dispatchEvent(new Event('popstate'));

        } catch (err) {
            await mostrarErrorModal('Selection Error', err.message);
        }
    });
}