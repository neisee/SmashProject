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

    status: (req, res) => {
        if (req.cookies && req.cookies.auth_session) {
            return res.status(200).json({ loggedIn: true });
        }
        return res.status(200).json({ loggedIn: false });
    },

    logout: (req, res) => {
        res.clearCookie('auth_session', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });
        console.log('📌 User logged out successfully');
        return res.status(200).json({ message: 'Logout successful' });
    }
};

module.exports = authController;