export function renderJoinLeague() {
    const contenedor = document.getElementById('vista-principal');
    
    // Inyectamos el formulario con el campo Name y el campo Invitation Code
    contenedor.innerHTML = `
        <div class="auth-container">
            <h2>Join League</h2>
            <form id="form-league" class="auth-form">
                <div class="form-group">
                    <label for="league-name">Name</label>
                    <input type="text" id="league-name" required autocomplete="off" maxlength="100">
                </div>
                <div class="form-group">
                    <label for="league-inv-code">Invitation Code</label>
                    <input type="text" id="league-inv-code" autocomplete="off" maxlength="8">
                </div>
                <div id="league-error" class="error-msg oculto"></div>
                <div id="league-success" class="success-msg oculto"></div>

                <button type="submit" class="btn-auth">Join League</button>
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
        errorDiv.textContent = '';
        successDiv.textContent = '';
        
        // 1. CAPTURAMOS AMBOS VALORES DEL FORMULARIO
        const name = document.getElementById('league-name').value;
        const inv_code = document.getElementById('league-inv-code').value;

        try {
            // Petición a tu backend
            const respuesta = await fetch('/api/auth/join-league', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 2. ENVIAMOS AMBOS DATOS EN EL JSON
                body: JSON.stringify({ name, inv_code })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'League Joining error');
            }

            // Mostrar mensaje de éxito si todo sale bien
            successDiv.textContent = datos.message || 'Successfully joined the league!';
            successDiv.classList.remove('oculto');

            leagueForm.reset();

            setTimeout(() => {
                window.history.pushState({}, '', '/hola');
                window.dispatchEvent(new Event('popstate')); // Forzamos al router a cambiar de vista
            }, 1000);
            
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('oculto');
        }
    });
}