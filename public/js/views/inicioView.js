const contenedor = document.getElementById('vista-principal');

export function renderInicio(usuarios, alPulsarUsuario) {
    document.body.style.backgroundColor = "white";
    document.body.style.color = "black";

    contenedor.innerHTML = `
        <h1>Lista de Usuarios</h1>
        <ul id="lista-usuarios"></ul>
    `;

    const lista = document.getElementById('lista-usuarios');
    
    if (!usuarios || usuarios.length === 0) {
        lista.innerHTML = '<li>No hay usuarios cargados aún.</li>';
        return;
    }

    usuarios.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.nombre} - ${user.rol}`;
        // Al hacer clic, ejecuta la función que le mande el router
        li.addEventListener('click', () => alPulsarUsuario(user.nombre));
        lista.appendChild(li);
    });
}