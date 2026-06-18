export function obtenerUsuarios() {
    return fetch('/api/usuarios')
        .then(res => {
            if (!res.ok) throw new Error("Error al traer usuarios");
            return res.json();
        })
        .catch(err => console.error("Error en el servicio:", err));
}