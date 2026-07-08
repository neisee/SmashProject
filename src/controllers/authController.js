const bcrypt = require('bcrypt');
const UserModel = require('../models/userModel');

const authController = {
    register: async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        try {
            const userExists = await UserModel.findByUsername(username);
            if (userExists) {
                return res.status(400).json({ error: 'Username is already taken' });
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const newUser = await UserModel.create(username, hashedPassword);

            return res.status(201).json({
                message: 'User registered successfully!',
                user: newUser
            });
        } catch (error) {
            console.error('Register error', error);
            return res.status(500).json({ error: 'Database server error' });
        }
    },

    login: async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        try {
            const user = await UserModel.findByUsername(username);
            if (!user) {
                return res.status(401).json({ error: 'username does not exist' });
            }

            const passwordMatch = await bcrypt.compare(password, user.hashed_password);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid username or password.' });
            }

            res.cookie('auth_session', 'logged_in_user_' + user.user_id, {
                httpOnly: true,
                secure: false, // Cambiar a true en producción con HTTPS
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000
            });

            console.log(`User successfully logged in: ${user.username}`);
            return res.status(200).json({ 
                message: 'Login successful!',
                user: { id: user.user_id, username: user.username }
            });
        } catch (error) {
            console.error('Database error during login:', error);
            return res.status(500).json({ error: 'Internal server error. Please try again later.' });
        }
    },

    status: async (req, res) => {
        // 1. Comprobamos si existe nuestra cookie
        if (req.cookies && req.cookies.auth_session) {
            try {
                const cookieValue = req.cookies.auth_session;
                const userId = cookieValue.split('logged_in_user_')[1];

                // 2. Buscamos al usuario real en la base de datos para obtener su username actualizado
                const user = await UserModel.findById(userId);

                // Si el usuario existe en la BD, respondemos con sus datos reales
                if (user) {
                    return res.status(200).json({ 
                        loggedIn: true, 
                        user: {
                            id: user.user_id,
                            username: user.username // 👈 ¡Aquí viaja el nombre real!
                        }
                    });
                }
            } catch (error) {
                console.error('Error al verificar el estatus de autenticación:', error);
                // Si la base de datos falla, por seguridad asumimos que no está logueado
                return res.status(500).json({ loggedIn: false, error: 'Internal server error' });
            }
        }
        
        // Si no hay cookie o el usuario no existe
        return res.status(200).json({ loggedIn: false });
    },

    logout: (req, res) => {
        res.clearCookie('auth_session', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });
        console.log('User logged out successfully');
        return res.status(200).json({ message: 'Logout successful' });
    },

    updateAccount: async (req, res) => {
        // 1. Verificación de sesión mediante cookie
        if (!req.cookies || !req.cookies.auth_session) {
            return res.status(401).json({ error: 'Not authorized. Please log in first.' });
        }

        const { username, currentPassword, newPassword } = req.body;

        // Validaciones básicas de campos obligatorios
        if (!username || !currentPassword) {
            return res.status(400).json({ error: 'Username and current password are required.' });
        }

        try {
            // Extraer el ID de usuario desde tu formato de cookie 'logged_in_user_ID'
            const cookieValue = req.cookies.auth_session;
            const userId = cookieValue.split('logged_in_user_')[1];

            // 2. Buscar al usuario actual en la base de datos
            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            // 3. SEGURO DE SEGURIDAD: Verificar que la contraseña actual provista coincida con la de la BD
            const isMatch = await bcrypt.compare(currentPassword, user.hashed_password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Incorrect current password.' });
            }

            // 4. Validar disponibilidad del nuevo Username (solo si el usuario lo cambió)
            if (username.toLowerCase() !== user.username.toLowerCase()) {
                const usernameExists = await UserModel.findByUsername(username);
                if (usernameExists) {
                    return res.status(400).json({ error: 'Username is already taken by another player.' });
                }
            }

            let updatedUser;

            // 5. Determinar el tipo de actualización (¿Quiere cambiar contraseña también?)
            if (newPassword) {
                // Si mandó una nueva contraseña, la encriptamos antes de guardarla
                const saltRounds = 10;
                const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
                
                // Actualizamos ambos campos en la BD
                updatedUser = await UserModel.updateAccount(userId, username, hashedNewPassword);
            } else {
                // Si no mandó nueva contraseña, solo actualizamos el username
                updatedUser = await UserModel.updateUsername(userId, username);
            }

            // 6. Respuesta exitosa
            return res.status(200).json({
                message: 'Account updated successfully!',
                user: {
                    id: updatedUser.user_id,
                    username: updatedUser.username
                }
            });

        } catch (error) {
            console.error('Error updating account:', error);
            return res.status(500).json({ error: 'Database server error.' });
        }
    }
};

module.exports = authController;