const pool = require('./db');

const UserModel = {
    // Buscar usuario por nombre (ignorando mayúsculas/minúsculas)
    findByUsername: async (username) => {
        const query = 'SELECT * FROM Users WHERE LOWER(username) = LOWER($1)';
        const result = await pool.query(query, [username.trim()]);
        return result.rows[0]; // Retorna el usuario o undefined
    },

    // Registrar un nuevo usuario
    create: async (username, hashedPassword) => {
        const query = 'INSERT INTO Users (username, hashed_password) VALUES ($1, $2) RETURNING user_id, username';
        const result = await pool.query(query, [username.trim(), hashedPassword]);
        return result.rows[0];
    },

    findById: async (userId) => {
        const query = 'SELECT * FROM Users WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    updateUsername: async (userId, newUsername) => {
        const query = 'UPDATE Users SET username = $1 WHERE user_id = $2 RETURNING user_id, username';
        const result = await pool.query(query, [newUsername.trim(), userId]);
        return result.rows[0];
    },

    updateAccount: async (userId, newUsername, hashedNewPassword) => {
        const query = 'UPDATE Users SET username = $1, hashed_password = $2 WHERE user_id = $3 RETURNING user_id, username';
        const result = await pool.query(query, [newUsername.trim(), hashedNewPassword, userId]);
        return result.rows[0];
    }
};

module.exports = UserModel;