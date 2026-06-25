import { renderHola } from './views/holaView.js';
import { renderRegister } from './views/registerView.js';
import { renderLogin } from './views/loginView.js';
import { renderCreateLeague } from './views/createLeagueView.js';
import { renderJoinLeague } from './views/joinLeagueView.js';

// Nueva función auxiliar para consultar la cookie al servidor
async function checkAuthStatus() {
    try {
        const respuesta = await fetch('/api/auth/status');
        const datos = await respuesta.json();
        return datos.loggedIn; // Devuelve true o false
    } catch (error) {
        return false;
    }
}

// Convertimos evaluarRuta en una función ASYNC
async function evaluarRuta() {
    const rutaActual = window.location.pathname;
    const isLoggedIn = await checkAuthStatus(); // Esperamos la respuesta del servidor

    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const btnLogout = document.getElementById('btn-logout');

    // Reseteamos clases de iluminación
    btnLogin.classList.remove('activo');
    btnRegister.classList.remove('activo');

    // --- ENTORNO NO LOGUEADO ---
    if (!isLoggedIn) {
        btnLogin.style.display = 'block';
        btnRegister.style.display = 'block';
        btnLogout.style.display = 'none';

        // ✨ CORRECCIÓN 1: Si intentan entrar a /create-league sin sesión, los echa al /login
        if (rutaActual === '/' || rutaActual === '') {
            window.history.replaceState({}, '', '/login');
            btnLogin.classList.add('activo');
            return renderLogin();
        }

        if (rutaActual === '/login') {
            btnLogin.classList.add('activo');
            return renderLogin();
        }
        else if (rutaActual === '/register') {
            btnRegister.classList.add('activo');
            return renderRegister();
        }
        else{
            window.history.replaceState({}, '', '/login');
            btnLogin.classList.add('activo');
            return renderLogin();
        }
    } 
    
    // --- ENTORNO LOGUEADO ---
    else {
        // Ocultamos los botones de login y registro porque ya tiene sesión iniciada
        btnLogin.style.display = 'none';
        btnRegister.style.display = 'none';
        btnLogout.style.display = 'block';

        // Si está logueado y va a la raíz, al login o al registro, lo mandamos a /hola
        if (rutaActual === '/' || rutaActual === '') {
            window.history.replaceState({}, '', '/hola');
            return renderHola();
        }

        if (rutaActual === '/hola') {
            return renderHola();
        }
        else if (rutaActual === '/create-league'){
            return renderCreateLeague();
        }
        else if (rutaActual === '/join-league'){
            return renderJoinLeague();
        }
        else{
            window.history.replaceState({}, '', '/hola');
            btnLogin.classList.add('activo');
            return renderHola();
        }
    }

    // --- RUTA NO ENCONTRADA (404) ---
    console.log("Ruta no encontrada: " + rutaActual);
    document.getElementById('vista-principal').innerHTML = `<h2>Page not found 😢</h2>`;
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

document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
        const respuesta = await fetch('/api/auth/logout', { method: 'POST' });
        
        if (respuesta.ok) {
            // Si el servidor borra la cookie con éxito, mandamos al usuario a la raíz
            window.history.pushState({}, '', '/');
            evaluarRuta(); // Al evaluar la ruta sin cookie, el entorno lo mandará automáticamente a /login
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Ejecución inicial al cargar la web
evaluarRuta();