// public/js/router.js

// 1. Importamos la función que acabamos de crear
import { renderHola } from './views/holaView.js';

function evaluarRuta() {
    // 1. Conseguimos la ruta actual donde está el usuario
    const rutaActual = window.location.pathname;

    // 2. Si está en la raíz '/', lo redirigimos automáticamente a la subruta
    if (rutaActual === '/' || rutaActual === '') {
        // Usamos replaceState para que no guarde la raíz vacía en el historial de "Atrás"
        window.history.replaceState({}, '', '/inicio'); 
        
        // Volvemos a ejecutar la función para que procese la nueva ruta '/inicio'
        return evaluarRuta(); 
    }

    // 3. Evaluamos las subrutas de tu nueva app
    if (rutaActual === '/inicio') {
        renderHola();
    } else {
        // Por si escribe cualquier otra cosa en la URL, lo mandamos a una vista 404 o de vuelta a inicio
        console.log("Ruta no encontrada: " + rutaActual);
        document.getElementById('vista-principal').innerHTML = `<h2>Página no encontrada 😢</h2>`;
    }
}

// Escuchas del navegador y logo
window.addEventListener('popstate', evaluarRuta);

document.getElementById('logo-home').addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    evaluarRuta();
});

// Arrancar la app nada más cargar la página
evaluarRuta();