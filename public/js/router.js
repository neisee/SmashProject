import { renderHola } from './views/holaView.js';
import { renderRegister } from './views/registerView.js';
import { renderLogin } from './views/loginView.js';

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

    // Reseteamos clases de iluminación
    btnLogin.classList.remove('activo');
    btnRegister.classList.remove('activo');

    // --- ENTORNO NO LOGUEADO ---
    if (!isLoggedIn) {
        // Mostramos los botones de login/register en la barra superior si estaban ocultos
        btnLogin.style.display = 'block';
        btnRegister.style.display = 'block';

        // Si intenta entrar a la raíz o a cualquier ruta privada, lo mandamos directo a /login
        if (rutaActual === '/' || rutaActual === '' || rutaActual === '/hola' || rutaActual === '/inicio') {
            window.history.replaceState({}, '', '/login');
            btnLogin.classList.add('activo');
            return renderLogin();
        }

        if (rutaActual === '/login') {
            btnLogin.classList.add('activo');
            return renderLogin();
        }

        if (rutaActual === '/register') {
            btnRegister.classList.add('activo');
            return renderRegister();
        }
    } 
    
    // --- ENTORNO LOGUEADO ---
    else {
        // Ocultamos los botones de login y registro porque ya tiene sesión iniciada
        btnLogin.style.display = 'none';
        btnRegister.style.display = 'none';

        // Si está logueado y va a la raíz, al login o al registro, lo mandamos a /hola
        if (rutaActual === '/' || rutaActual === '' || rutaActual === '/login' || rutaActual === '/register' || rutaActual === '/inicio') {
            window.history.replaceState({}, '', '/hola');
            return renderHola();
        }

        if (rutaActual === '/hola') {
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

// Ejecución inicial al cargar la web
evaluarRuta();