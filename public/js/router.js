import { obtenerUsuarios } from './services/usuarioService.js';
import { renderInicio } from './views/inicioView.js';
import { renderSaludo } from './views/saludoView.js';

function evaluarRuta() {
    const params = new URLSearchParams(window.location.search);
    const nombre = params.get('nombre');

    if (window.location.pathname === '/saludo' && nombre) {
        renderSaludo(nombre);
    } else {
        // Pedimos datos al servicio y cuando lleguen, renderizamos inicio
        obtenerUsuarios().then(usuarios => {
            renderInicio(usuarios, (nombreUsuario) => {
                // Al pulsar un usuario, cambiamos la URL y mandamos al saludo
                const nuevaUrl = `/saludo?nombre=${encodeURIComponent(nombreUsuario)}`;
                window.history.pushState({}, '', nuevaUrl);
                renderSaludo(nombreUsuario);
            });
        });
    }
}

// Escuchar los botones Atrás/Adelante del navegador
window.addEventListener('popstate', evaluarRuta);

// Escuchar clic en el logo para volver a la raíz
document.getElementById('logo-home').addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    evaluarRuta();
});

// Arrancar la app nada más cargar la página
evaluarRuta();