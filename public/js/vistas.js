// Capturamos los elementos visuales que necesitamos modificar
const vista = document.getElementById('vista-principal');

// --- VISTA 1: PANTALLA DE INICIO ---
export function mostrarVistaInicio(alHacerClicEnUsuario) {
    document.body.style.backgroundColor = "white";
    document.body.style.color = "black";

    vista.innerHTML = `
        <h1>Lista de Usuarios</h1>
        <button id="btnCargar">Cargar Usuarios con AJAX</button>
        <ul id="lista-usuarios"></ul>
    `;

    document.getElementById('btnCargar').addEventListener('click', () => {
        fetch('/api/usuarios')
            .then(res => res.json())
            .then(usuarios => {
                const lista = document.getElementById('lista-usuarios');
                lista.innerHTML = '';
                
                usuarios.forEach(usuario => {
                    const li = document.createElement('li');
                    li.textContent = `${usuario.nombre} - ${usuario.rol}`;
                    
                    // Cuando pinchen, le avisamos al enrutador pasándole el nombre
                    li.addEventListener('click', () => {
                        alHacerClicEnUsuario(usuario.nombre);
                    });
                    
                    lista.appendChild(li);
                });
            });
    });
}

// --- VISTA 2: PANTALLA DE SALUDO ---
export function mostrarVistaSaludo(nombre) {
    document.body.style.backgroundColor = "#2ecc71";
    document.body.style.color = "white";

    vista.innerHTML = `<div class="vista-verde">Hola, ${nombre} 👋</div>`;
}