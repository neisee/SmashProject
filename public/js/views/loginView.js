export function renderLogin() {
    const contenedor = document.getElementById('vista-principal');
    
    // Inyectamos el formulario de registro adaptado a tu contenedor
    contenedor.innerHTML = `
        <div class="auth-container">
            <h2>Sign In</h2>
            <form id="form-login" class="auth-form">
                <div class="form-group">
                    <label for="login-username">Username</label>
                    <input type="text" id="login-username" required placeholder="Enter your username" autocomplete="off">
                </div>
                
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" required>
                </div>

                <div id="login-error" class="error-msg oculto"></div>

                <button type="submit" class="btn-auth">Sign In</button>
            </form>
        </div>
    `;

    // Manejo del formulario
    const formulario = document.getElementById('form-login');
    const errorDiv = document.getElementById('login-error');

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        
        // Limpiamos mensajes previos
        errorDiv.classList.add('oculto');

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            // Petición a tu backend (crearemos la ruta de la API después si lo necesitas)
            const respuesta = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'Login error');
            }
            
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new Event('popstate')); // Forzamos al router a cambiar de vista

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('oculto');
        }
    });
}