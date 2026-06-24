export function renderRegister() {
    const contenedor = document.getElementById('vista-principal');
    
    // Inyectamos el formulario de registro adaptado a tu contenedor
    contenedor.innerHTML = `
        <div class="auth-container">
            <h2>Create Account</h2>
            <form id="form-register" class="auth-form">
                <div class="form-group">
                    <label for="reg-username">Username</label>
                    <input type="text" id="reg-username" required>
                </div>
                
                <div class="form-group">
                    <label for="reg-password">Password</label>
                    <input type="password" id="reg-password" required>
                </div>

                <div class="form-group">
                    <label for="reg-password-confirm">Confirm Password</label>
                    <input type="password" id="reg-password-confirm" required>
                </div>

                <div id="register-error" class="error-msg oculto"></div>
                <div id="register-success" class="success-msg oculto">Register Completed</div>

                <button type="submit" class="btn-auth">Register</button>
            </form>
        </div>
    `;

    // Manejo del formulario
    const formulario = document.getElementById('form-register');
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        
        // Limpiamos mensajes previos
        errorDiv.classList.add('oculto');
        successDiv.classList.add('oculto');

        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;

        // Validación básica en Frontend
        if (password !== passwordConfirm) {
            errorDiv.textContent = "Passwords do not match";
            errorDiv.classList.remove('oculto');
            return;
        }

        try {
            // Petición a tu backend (crearemos la ruta de la API después si lo necesitas)
            const respuesta = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'Register error');
            }

            // Si todo va bien, mostramos éxito y redirigimos al login tras 1.5 segundos
            successDiv.classList.remove('oculto');
            formulario.reset();
            
            setTimeout(() => {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new Event('popstate')); // Forzamos al router a cambiar de vista
            }, 1500);

        } catch (error) {
            errorDiv.textContent = `${error.message}`;
            errorDiv.classList.remove('oculto');
        }
    });
}