const { pool } = require('../config/database');

const roles = async (req, res) => {
    try {
        const sql = 'SELECT * FROM roles';
        const [results] = await pool.query(sql);
        res.json(results);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: 'An error occurred while fetching roles' });
    }
};

const userRoles = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'Invalid user IDs' });
        }

        const placeholders = userIds.map(() => '?').join(',');
        const sql = `
            SELECT ur.user_id, r.role_name
            FROM user_role ur
            JOIN roles r ON ur.role_id = r.role_id
            WHERE ur.user_id IN (${placeholders})
        `;

        const [results] = await pool.query(sql, userIds);
        res.json(results);
    } catch (err) {
        console.error('Error fetching user roles:', err);
        res.status(500).json({ error: 'An error occurred while fetching user roles' });
    }
};

const assignRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { roleId } = req.body;
        const sql = 'INSERT INTO user_role (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = ?';
        const values = [userId, roleId, roleId];
        
        await pool.query(sql, values);
        res.json({ message: 'Role assigned successfully' });
    } catch (err) {
        console.error('Error assigning role:', err);
        res.status(500).json({ error: 'An error occurred while assigning the role' });
    }
};

module.exports = {
    roles,
    userRoles,
    assignRole,
};