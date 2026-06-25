export function renderEditAccount() {
    const contenedor = document.getElementById('vista-principal');
    
    // 1. Intentamos obtener el nombre actual directamente del botón del header para pre-rellenar el input
    const currentUsername = document.getElementById('btn-edit-profile')?.textContent || '';

    // Inyectamos el formulario modificado
    contenedor.innerHTML = `
        <div class="auth-container">
            <h2>Edit Account</h2>
            <form id="form-edit-account" class="auth-form">
                
                <div class="form-group">
                    <label for="edit-username">Username</label>
                    <input type="text" id="edit-username" value="${currentUsername}" required autocomplete="off" maxlength="100">
                </div>

                <hr style="border: 0; border-top: 1px solid #333; margin: 10px 0;">
                <p style="font-size: 13px; color: #aaa; margin: 0; text-align: center;">Leave password fields blank if you don't want to change it</p>

                <div class="form-group">
                    <label for="edit-current-password">Current Password (Required for any change)</label>
                    <input type="password" id="edit-current-password" required>
                </div>
                
                <div class="form-group">
                    <label for="edit-new-password">New Password</label>
                    <input type="password" id="edit-new-password">
                </div>

                <div class="form-group">
                    <label for="edit-new-password-confirm">Confirm New Password</label>
                    <input type="password" id="edit-new-password-confirm">
                </div>

                <div id="edit-account-error" class="error-msg oculto"></div>
                <div id="edit-account-success" class="success-msg oculto">Account updated successfully!</div>

                <button type="submit" class="btn-auth">Save Changes</button>
            </form>
        </div>
    `;

    const formulario = document.getElementById('form-edit-account');
    const errorDiv = document.getElementById('edit-account-error');
    const successDiv = document.getElementById('edit-account-success');

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorDiv.classList.add('oculto');
        successDiv.classList.add('oculto');

        const newUsername = document.getElementById('edit-username').value.trim();
        const currentPassword = document.getElementById('edit-current-password').value;
        const newPassword = document.getElementById('edit-new-password').value;
        const newPasswordConfirm = document.getElementById('edit-new-password-confirm').value;

        // Validación en Frontend: Si escribió algo en "New Password", obligamos a que coincida con la confirmación
        if (newPassword || newPasswordConfirm) {
            if (newPassword !== newPasswordConfirm) {
                errorDiv.textContent = "New passwords do not match";
                errorDiv.classList.remove('oculto');
                return;
            }
        }

        try {
            // Petición al backend enviando tanto el username como las contraseñas
            const respuesta = await fetch('/api/auth/update-account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: newUsername, 
                    currentPassword, 
                    newPassword: newPassword || null // Si está vacío, mandamos null
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'Update account error');
            }

            // Mostrar mensaje de éxito
            successDiv.classList.remove('oculto');
            formulario.reset();
            
            // Importante: Si el backend actualizó con éxito, disparamos un re-enrutado completo 
            // para que el header se actualice con el nuevo nombre de usuario
            setTimeout(() => {
                window.history.pushState({}, '', '/hola');
                window.dispatchEvent(new Event('popstate'));
            }, 1500);

        } catch (error) {
            errorDiv.textContent = `${error.message}`;
            errorDiv.classList.remove('oculto');
        }
    });
}