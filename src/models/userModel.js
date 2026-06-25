const pool = require('./db');

const UserModel = {
    // Buscar usuario por nombre (ignorando mayúsculas/minúsculas)
    findByUsername: async (username) => {
        const query = 'SELECT * FROM Users WHERE LOWER(username) = LOWER($1)';
        const result = await pool.query(query, [username]);
        return result.rows[0]; // Retorna el usuario o undefined
    },

    // Registrar un nuevo usuario
    create: async (username, hashedPassword) => {
        const query = 'INSERT INTO Users (username, hashed_password) VALUES ($1, $2) RETURNING user_id, username';
        const result = await pool.query(query, [username.trim(), hashedPassword]);
        return result.rows[0];
    }
};

module.exports = UserModel;