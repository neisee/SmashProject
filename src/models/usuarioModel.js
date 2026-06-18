const usuariosBD = [
    { id: 1, nombre: 'Chaval', rol: 'Developer Node' },
    { id: 2, nombre: 'Profe', rol: 'Java Senior' },
    { id: 3, nombre: 'Neisee', rol: 'Fullstack Pro' }
];

function obtenerTodos() {
    return usuariosBD;
}

module.exports = {
    obtenerTodos
};