const contenedor = document.getElementById('vista-principal');

export function renderSaludo(nombre) {
    document.body.style.backgroundColor = "#2ecc71";
    document.body.style.color = "white";
    contenedor.innerHTML = `<div class="vista-verde">Hola, ${nombre} 👋</div>`;
}