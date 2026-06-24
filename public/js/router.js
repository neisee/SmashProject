import { renderHola } from './views/holaView.js';
import { renderRegister } from './views/registerView.js';

function evaluarRuta() {
    const rutaActual = window.location.pathname;

    // Redirección de la raíz a /inicio
    if (rutaActual === '/' || rutaActual === '') {
        window.history.replaceState({}, '', '/inicio'); 
        return evaluarRuta(); 
    }

    // --- CONTROL DE ESTADO ACTIVO ---
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');

    // Primero quitamos la clase activo de todos los botones para resetear el estado
    btnLogin.classList.remove('activo');
    btnRegister.classList.remove('activo');

    // 3. Evaluamos las rutas e iluminamos el contorno del botón correspondiente
    if (rutaActual === '/inicio') {
        // Si estás en inicio, ninguno está activo (o el de inicio si tuvieras uno)
        renderHola();
        
    } else if (rutaActual === '/login') {
        // Iluminamos el botón de Login
        btnLogin.classList.add('activo');
        document.getElementById('vista-principal').innerHTML = `<h2>Pantalla de Login 🔐</h2>`;
        
    } else if (rutaActual === '/register') {
        // Iluminamos el botón de Register
        btnRegister.classList.add('activo');
        renderRegister();
        
    } else {
        console.log("Ruta no encontrada: " + rutaActual);
        document.getElementById('vista-principal').innerHTML = `<h2>Página no encontrada 😢</h2>`;
    }
}

// --- ESCUCHAS DE EVENTOS (Se quedan exactamente igual) ---
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

evaluarRuta();