import { renderHola } from './views/holaView.js';
import { renderRegister } from './views/registerView.js';
import { renderLogin } from './views/loginView.js';
import { renderCreateLeague } from './views/createLeagueView.js';
import { renderJoinLeague } from './views/joinLeagueView.js';
import { renderEditAccount } from './views/editAccountView.js';
import { renderLeagueDetails } from './views/leagueDetailsView.js';
import { renderEditPlayedMatches } from './views/editPlayedMatchesView.js';
import { renderSelectCharacter } from './views/selectCharacterView.js';
import { renderUsedCharacters } from './views/usedCharactersView.js';

// Auxiliar para consultar la cookie al servidor
async function checkAuthStatus() {
    try {
        const respuesta = await fetch('/api/auth/status');
        const datos = await respuesta.json();
        
        return { 
            loggedIn: datos.loggedIn, 
            username: datos.user?.username || 'Cuenta' 
        };
    } catch (error) {
        return { loggedIn: false, username: '' };
    }
}

async function evaluarRuta() {
    // 🔥 CLAVE: Si el usuario cambia de ruta (por clics, historial o popstate),
    // cerramos inmediatamente el WebSocket activo para evitar conexiones fantasmas.
    if (window.activeLeagueSocket) {
        console.log('🔌 Limpiando WebSocket remanente desde el Router...');
        window.activeLeagueSocket.close();
        window.activeLeagueSocket = null;
    }

    const rutaActual = window.location.pathname;
    const auth = await checkAuthStatus();

    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const btnLogout = document.getElementById('btn-logout');
    const btnEditProfile = document.getElementById('btn-edit-profile');

    // Reseteamos clases de iluminación
    btnLogin.classList.remove('activo');
    btnRegister.classList.remove('activo');
    if (btnEditProfile) btnEditProfile.classList.remove('activo');

    // --- ENTORNO NO LOGUEADO ---
    if (!auth.loggedIn) {
        btnLogin.style.display = 'block';
        btnRegister.style.display = 'block';
        btnLogout.style.display = 'none';
        if (btnEditProfile) btnEditProfile.classList.add('oculto');

        if (rutaActual === '/' || rutaActual === '' || rutaActual === '/login') {
            window.history.replaceState({}, '', '/login');
            btnLogin.classList.add('activo');
            return renderLogin();
        }
        else if (rutaActual === '/register') {
            btnRegister.classList.add('activo');
            return renderRegister();
        }
        else {
            window.history.replaceState({}, '', '/login');
            btnLogin.classList.add('activo');
            return renderLogin();
        }
    } 
    
    // --- ENTORNO LOGUEADO ---
    else {
        btnLogin.style.display = 'none';
        btnRegister.style.display = 'none';
        btnLogout.style.display = 'block';

        if (btnEditProfile) {
            btnEditProfile.textContent = auth.username;
            btnEditProfile.classList.remove('oculto');
        }

        if (rutaActual === '/' || rutaActual === '' || rutaActual === '/hola') {
            window.history.replaceState({}, '', '/hola');
            return renderHola();
        }
        else if (rutaActual === '/create-league'){
            return renderCreateLeague();
        }
        else if (rutaActual === '/join-league'){
            return renderJoinLeague();
        }
        else if (rutaActual === '/edit-account'){
            if (btnEditProfile) btnEditProfile.classList.add('activo');
            return renderEditAccount();
        }
        else if (rutaActual.startsWith('/league/') && rutaActual.endsWith('/edit-matches')) {
            const leagueId = rutaActual.split('/league/')[1].split('/edit-matches')[0];
            
            if (!leagueId || isNaN(leagueId)) {
                window.history.replaceState({}, '', '/hola');
                return renderHola();
            }
            return renderEditPlayedMatches(leagueId);
        }
        else if (rutaActual.startsWith('/league/') && rutaActual.includes('/used-characters/')) {
            const partes = rutaActual.split('/league/')[1].split('/used-characters/');
            const leagueId = partes[0];
            const userId = partes[1];

            if (!leagueId || isNaN(leagueId) || !userId || isNaN(userId)) {
                window.history.replaceState({}, '', '/hola');
                return renderHola();
            }

            return renderUsedCharacters(leagueId, userId);
        }
        else if (rutaActual.startsWith('/league/') && rutaActual.includes('/select-character/')) {
            // Extraemos los IDs de la ruta /league/12/select-character/45
            
            const partes = rutaActual.split('/league/')[1].split('/select-character/');
            const leagueId = partes[0];
            const matchId = partes[1];
            
            if (!leagueId || isNaN(leagueId) || !matchId || isNaN(matchId)) {
                window.history.replaceState({}, '', '/hola');
                return renderHola();
            }
            
            // Aquí llamas a tu vista (recuerda importarla arriba en el router)
            
            return renderSelectCharacter(leagueId, matchId);
        }
        else if (rutaActual.startsWith('/league/')) {
            const leagueId = rutaActual.split('/league/')[1];
            
            if (!leagueId || isNaN(leagueId)) {
                window.history.replaceState({}, '', '/hola');
                return renderHola();
            }
            
            return renderLeagueDetails(leagueId);
        }
        else {
            window.history.replaceState({}, '', '/hola');
            return renderHola();
        }
    }
}

// --- ESCUCHAS DE EVENTOS ---
window.addEventListener('popstate', evaluarRuta);

document.getElementById('logo-home').addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    evaluarRuta();
});

document.getElementById('btn-login').addEventListener('click', () => {
    window.history.pushState({}, '', '/login');
    evaluarRuta();
});

document.getElementById('btn-register').addEventListener('click', () => {
    window.history.pushState({}, '', '/register');
    evaluarRuta();
});

const btnEditProfile = document.getElementById('btn-edit-profile');
if (btnEditProfile) {
    btnEditProfile.addEventListener('click', () => {
        window.history.pushState({}, '', '/edit-account');
        evaluarRuta();
    });
}

document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
        const respuesta = await fetch('/api/auth/logout', { method: 'POST' });
        if (respuesta.ok) {
            window.history.pushState({}, '', '/');
            evaluarRuta(); 
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Ejecución inicial al cargar la web
evaluarRuta();