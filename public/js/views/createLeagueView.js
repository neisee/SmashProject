export function renderCreateLeague() {
    const contenedor = document.getElementById('vista-principal');
    
    // Inyectamos el formulario de registro adaptado a tu contenedor
    contenedor.innerHTML = `
        <div class="auth-container">
            <h2>Create League</h2>
            <form id="form-league" class="auth-form">
                <div class="form-group">
                    <label for="league-name">Name</label>
                    <input type="text" id="league-name" required autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="league-inv-code">Invitation Code</label>
                    <input type="text" id="league-inv-code" required autocomplete="off" maxlength="8">
                </div>
                <div id="league-error" class="error-msg oculto"></div>
                <div id="league-success" class="success-msg oculto">League Successfully Created</div>

                <button type="submit" class="btn-auth">Create League</button>
            </form>
        </div>
    `;

    // Manejo del formulario
    const leagueForm = document.getElementById('form-league');
    const errorDiv = document.getElementById('league-error');
    const successDiv = document.getElementById('league-success');

    leagueForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        
        // Limpiamos mensajes previos
        errorDiv.classList.add('oculto');
        successDiv.classList.add('oculto');

        const name = document.getElementById('league-name').value.trim();
        const inv_code = document.getElementById('league-inv-code').value;

        try {
            // Petición a tu backend (crearemos la ruta de la API después si lo necesitas)
            const respuesta = await fetch('/api/auth/create-league', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, inv_code })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'League Creation error');
            }

            // Si todo va bien, mostramos éxito y redirigimos al login tras 1.5 segundos
            successDiv.classList.remove('oculto');
            leagueForm.reset();
            
            setTimeout(() => {
                window.history.pushState({}, '', '/hola');
                window.dispatchEvent(new Event('popstate')); // Forzamos al router a cambiar de vista
            }, 1500);

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('oculto');
        }
    });
}