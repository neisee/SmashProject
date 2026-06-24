// Variables globales de la vista para mantener el estado de la paginación
let offset = 0;
const LIMITE = 10;

export async function renderHola() {
    const contenedor = document.getElementById('vista-principal');
    
    // Al entrar a la vista por primera vez, reiniciamos el contador
    offset = 0;

    // 1. Inyectamos la estructura base fija del dashboard junto con el contenedor de la lista y el botón
    contenedor.innerHTML = `
        <div class="dashboard">
            <h2>🏆 Mis Ligas</h2>
            <div id="lista-ligas"></div>
            
            <div id="contenedor-cargar-mas" style="text-align: center; margin-top: 20px;">
                <button id="btn-cargar-mas" class="btn-nav" style="display: none;">Cargar más ligas</button>
            </div>
        </div>
    `;

    // 2. Ejecutamos la primera carga de las primeras 10 ligas
    await cargarLigas();

    // 3. Escuchamos el evento click del botón "Cargar más"
    document.getElementById('btn-cargar-mas').addEventListener('click', cargarLigas);
}

async function cargarLigas() {
    const listaContenedor = document.getElementById('lista-ligas');
    const btnCargarMas = document.getElementById('btn-cargar-mas');

    // Si es la primera carga, mostramos un texto temporal de carga interno
    if (offset === 0) {
        listaContenedor.innerHTML = '<p style="text-align: center; color: #888;">Cargando tus ligas...</p>';
    } else {
        btnCargarMas.innerText = "Cargando...";
        btnCargarMas.disabled = true;
    }

    try {
        // Hacemos el fetch enviando el límite (10) y cuántas nos saltamos (offset actual)
        const respuesta = await fetch(`/api/leagues?limit=${LIMITE}&offset=${offset}`);
        const ligas = await respuesta.json();

        // Si es la primera carga y no viene nada, es que el usuario no tiene ninguna liga
        if (offset === 0 && (!ligas || ligas.length === 0)) {
            listaContenedor.innerHTML = `
                <p style="color: #888; text-align: center; margin-top: 20px;">
                    No estás inscrito en ninguna liga todavía. <br>¡Únete a una o crea tu propio torneo!
                </p>
            `;
            btnCargarMas.style.display = 'none';
            return;
        }

        // Si es la primera carga, limpiamos el texto de "Cargando..." antes de añadir las tarjetas
        if (offset === 0) {
            listaContenedor.innerHTML = '';
        }

        // Mapeamos y generamos el HTML de las nuevas ligas recibidas
        const htmlLigas = ligas.map(liga => `
            <div style="background: #1a1a1a; padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333;">
                <h3>${liga.name}</h3>
                <p>👤 Creador: <strong>${liga.creador}</strong></p>
                <p>🔑 Código: <code>${liga.invitation_code}</code></p>
                <span style="color: ${liga.in_progress ? '#ff9800' : '#4caf50'}">
                    ${liga.in_progress ? '⏳ En curso' : '🟢 Inscripciones abiertas'}
                </span>
            </div>
        `).join('');

        // ¡IMPORTANTE!: Usamos += en lugar de asignar con = para añadir las nuevas tarjetas al final de las ya existentes
        listaContenedor.innerHTML += htmlLigas;

        // Restauramos el estado del botón
        btnCargarMas.disabled = false;
        btnCargarMas.innerText = "Cargar más ligas";

        // LÓGICA DEL BOTÓN: ¿Ocultar o mostrar?
        // Si el servidor nos devolvió menos ligas que el LÍMITE (menos de 10), significa que ya no quedan más en la DB
        if (ligas.length < LIMITE) {
            btnCargarMas.style.display = 'none'; // Escondemos el botón completamente
        } else {
            btnCargarMas.style.display = 'inline-block'; // Mostramos el botón si quedan más
            offset += LIMITE; // Incrementamos el offset en 10 para la próxima petición
        }

    } catch (error) {
        console.error("Error al conectar con la API paginada:", error);
        if (offset === 0) {
            listaContenedor.innerHTML = "❌ Error al cargar las ligas.";
        } else {
            alert("❌ Ocurrió un error al cargar más ligas.");
            btnCargarMas.disabled = false;
            btnCargarMas.innerText = "Cargar más ligas";
        }
    }
}