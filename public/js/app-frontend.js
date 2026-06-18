// Importamos las vistas que creamos en el otro archivo
import { mostrarVistaInicio, mostrarVistaSaludo } from './vistas.js';

// --- ENRUTADOR: Sabe qué pantalla toca según la URL ---
function evaluarRuta() {
    const parametros = new URLSearchParams(window.location.search);
    const nombre = parametros.get('nombre');

    if (window.location.pathname === '/saludo' && nombre) {
        mostrarVistaSaludo(nombre);
    } else {
        // Le pasamos como "Callback" (función por parámetro) lo que queremos que haga
        // cuando el usuario pinche en un elemento de la lista
        mostrarVistaInicio((nombreUsuario) => {
            const nuevaUrl = `/saludo?nombre=${encodeURIComponent(nombreUsuario)}`;
            window.history.pushState({}, '', nuevaUrl);
            mostrarVistaSaludo(nombreUsuario);
        });
    }
}

// Escuchar clics en el Logo para volver al inicio
document.getElementById('logo-home').addEventListener('click', () => {
    window.history.history.pushState({}, '', '/');
    evaluarRuta(); // Evaluamos la ruta para que pinte el inicio
});

// Detectar flechas atrás/adelante del navegador
window.addEventListener('popstate', evaluarRuta);

// Arrancar la SPA la primera vez que se abre la web
evaluarRuta();