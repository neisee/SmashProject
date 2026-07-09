import { mostrarErrorModal } from './leagueDetailsView.js';

export async function renderUsedCharacters(leagueId, userId) {
    const contenedor = document.getElementById('vista-principal');

    contenedor.innerHTML = `
        <div class="auth-container" style="max-width: 1100px;">
            <h2 style="margin-bottom: 5px; text-align: center;">Used Characters</h2>
            <p style="text-align: center; color: #ff8b0f; font-size: 14px; margin-top: 0; margin-bottom: 20px; font-weight: bold;">
                Characters used to win a game by this player in this league
            </p>
            <div id="used-characters-loading" style="color: #aaa; text-align: center; padding: 20px;">
                Loading characters...
            </div>
        </div>
    `;

    try {
        const [respCharacters, respBlocked] = await Promise.all([
            fetch('/api/characters'),
            fetch(`/api/leagues/${leagueId}/used-characters/${userId}`)
        ]);

        const dataCharacters = await respCharacters.json();
        if (!respCharacters.ok || !Array.isArray(dataCharacters.images)) {
            throw new Error('Could not load the characters list.');
        }

        let blockedIds = [];
        if (respBlocked.ok) {
            const blockedData = await respBlocked.json();
            blockedIds = Array.isArray(blockedData) ? blockedData : [];
        } else {
            const blockedData = await respBlocked.json().catch(() => ({}));
            throw new Error(blockedData.error || 'Could not load the blocked characters.');
        }

        const personajes = dataCharacters.images.map((archivo, index) => ({
            id: index + 1,
            archivo
        }));

        const personajesBloqueados = personajes.filter((personaje) => blockedIds.includes(personaje.id));

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
                <h2 style="margin-bottom: 5px; text-align: center; color: #fff; font-size: 26px;">Used Characters</h2>
                <p style="text-align: center; color: #ff8b0f; font-size: 14px; margin-top: 0; margin-bottom: 20px; font-weight: bold;">
                    Characters used to win a game by this player in this league
                </p>

                <div id="used-characters-grid" style="
                    display: grid;
                    grid-template-columns: repeat(11, 1fr);
                    gap: 10px;
                    background-color: #141414;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #1a1a1a;
                    margin-bottom: 25px;
                    width: 100%;
                    box-sizing: border-box;
                ">
                    ${personajesBloqueados.length > 0 ? personajesBloqueados.map((personaje) => `
                        <div style="
                            aspect-ratio: 3 / 2;
                            background-color: #262626;
                            border: 2px solid #444;
                            border-radius: 4px;
                            overflow: hidden;
                            position: relative;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-width: 70px;
                        ">
                            <img src="/images/Characters/${personaje.archivo}" alt="Character ${personaje.id}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;" />
                        </div>
                    `).join('') : `
                        <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #aaa; font-style: italic;">
                            No blocked characters found for this player yet.
                        </div>
                    `}
                </div>

                <div style="display: flex; gap: 16px; max-width: 500px; margin: 0 auto;">
                    <button id="btn-back-to-league" class="btn-auth" style="background-color: #2a2a2a; color: white; border: 1px solid #444; margin: 0; flex: 1; padding: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                        Back to League
                    </button>
                </div>
            </div>
        `;

        const grid = document.getElementById('used-characters-grid');
        if (grid) {
            const applyMobileLayout = () => {
                if (window.innerWidth <= 850) {
                    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(90px, 1fr))';
                    grid.style.maxWidth = '100%';
                } else {
                    grid.style.gridTemplateColumns = 'repeat(11, 1fr)';
                    grid.style.maxWidth = 'none';
                }
            };

            applyMobileLayout();
            window.addEventListener('resize', applyMobileLayout);
        }

        document.getElementById('btn-back-to-league').addEventListener('click', () => {
            window.history.back();
        });
    } catch (error) {
        await mostrarErrorModal('Characters Error', error.message);
        contenedor.innerHTML = `
            <div class="auth-container">
                <div class="error-msg">Could not load this player's used characters.</div>
            </div>
        `;
    }
}
