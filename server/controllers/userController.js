const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const secretKey = process.env.JWT_SECRET || 'Vv2N9SCG8RncrDGvfOYlFkaRpm25MA3mRaSCtjPcke4=';
const { sendWelcomeEmail } = require('../utils/mailer');

const getAllUsers = async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM Users');
        res.json(results);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

const AllUsersWithRoles = async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.*, 
                COALESCE(GROUP_CONCAT(r.role_name), '') AS roles
            FROM 
                Users u
            LEFT JOIN 
                user_role ur ON u.user_id = ur.user_id
            LEFT JOIN 
                roles r ON ur.role_id = r.role_id
            GROUP BY 
                u.user_id
        `;
        const [results] = await pool.query(sql);
        res.json(results);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};


const checkEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const [results] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        res.json({ exists: results.length > 0 });
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ error: 'An error occurred while checking email' });
    }
};

const signup = async (req, res) => {
    const { first_name, last_name, other_names, email, phone, national_id, address, password, gender } = req.body;
    const id_image = req.file ? req.file.filename : null;
    console.log("file: ", req.file);

    if (!email || !password || !gender || !first_name || !last_name) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into the Users table
        const sqlInsertUser = `
            INSERT INTO Users (first_name, last_name, other_names, email, phone, national_id, address, password, gender, ID_image, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;
        const userValues = [first_name, last_name, other_names || '', email, phone, national_id, address, hashedPassword, gender, id_image];

        const [userResult] = await pool.query(sqlInsertUser, userValues);
        const userId = userResult.insertId;

        // Send welcome email
        sendWelcomeEmail(email, first_name);

        // Assign role to user
        const sqlInsertUserRole = `
            INSERT INTO user_role (user_id, role_id)
            VALUES (?, ?)
        `;
        const roleValues = [userId, 203];

        await pool.query(sqlInsertUserRole, roleValues);

        res.status(201).json({ message: 'User signed up successfully and role assigned', userId });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ error: 'An unexpected error occurred during signup' });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const sql = `
            SELECT Users.*, user_role.role_id
            FROM Users
            LEFT JOIN user_role ON Users.user_id = user_role.user_id
            WHERE Users.email = ?
        `;
        const [results] = await pool.query(sql, [email]);

        if (results.length === 0) {
            return res.status(401).json({ error: 'No user with the given email' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const userResponse = {
            user_id: user.user_id,
            email: user.email,
            status: user.status,
            role_id: user.role_id
        };

        const token = jwt.sign(userResponse, secretKey, { expiresIn: '12h' });
        res.json({ message: 'Login successful', user: userResponse, token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};


const getUserById = async (req, res) => {
    try {
        const userId = req.params.userId;
        const sql = `
            SELECT 
                u.*, 
                GROUP_CONCAT(r.role_name) AS roles
            FROM 
                Users u
            LEFT JOIN 
                user_role ur ON u.user_id = ur.user_id
            LEFT JOIN 
                roles r ON ur.role_id = r.role_id
            WHERE 
                u.user_id = ?
            GROUP BY 
                u.user_id
        `;
        const [results] = await pool.query(sql, [userId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

const getUserDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const sql = `
            SELECT 
                u.*, 
                GROUP_CONCAT(r.role_name) AS roles
            FROM 
                Users u
            LEFT JOIN 
                user_role ur ON u.user_id = ur.user_id
            LEFT JOIN 
                roles r ON ur.role_id = r.role_id
            WHERE 
                u.user_id = ?
            GROUP BY 
                u.user_id
        `;
        const [results] = await pool.query(sql, [userId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};


const updateUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { first_name, last_name, email } = req.body;
        const sql = 'UPDATE Users SET first_name = ?, last_name = ?, email = ? WHERE user_id = ?';
        await pool.query(sql, [first_name, last_name, email, userId]);
        res.json({ message: 'User information updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const userId = req.params.userId;
        const defaultPassword = 'newPassword123';
        const sql = 'UPDATE Users SET password = ? WHERE user_id = ?';
        await pool.query(sql, [defaultPassword, userId]);
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};
const deleteUser = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.params.userId;

        await connection.beginTransaction();

        // Delete user role
        await connection.query('DELETE FROM user_role WHERE user_id = ?', [userId]);

        // Delete user
        await connection.query('DELETE FROM Users WHERE user_id = ?', [userId]);

        await connection.commit();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    } finally {
        await connection.release();
    }
};


const requestSalaryAdvance = async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        const sql = 'INSERT INTO SalaryAdvances (user_id, amount, reason, status) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(sql, [userId, amount, reason, 'pending']);
        res.status(201).json({ message: 'Salary advance request submitted successfully', requestId: result.insertId });
    } catch (error) {
        console.error('Error inserting salary advance request:', error);
        res.status(500).json({ error: 'An error occurred while inserting the request' });
    }
};

const createSupportTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { subject, message, priority } = req.body;
        const attachment = req.file ? req.file.filename : null;

        const sql = `
            INSERT INTO support_tickets (user_id, subject, message, status, priority, attachment)
            VALUES (?, ?, ?, 'open', ?, ?)
        `;

        const [result] = await pool.query(sql, [userId, subject, message, priority, attachment]);
        res.status(201).json({ message: 'Support ticket created successfully', ticketId: result.insertId });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ error: 'An error occurred while creating the support ticket' });
    }
};

const approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const sql = 'UPDATE Users SET status = ? WHERE user_id = ?';
        
        const [result] = await pool.query(sql, ['approved', userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User approved successfully', userId });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'An error occurred while approving user' });
    }
};

const rejectUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const sql = 'UPDATE Users SET status = ? WHERE user_id = ?';
        
        const [result] = await pool.query(sql, ['rejected', userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User rejected successfully', userId });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ error: 'An error occurred while rejecting user' });
    }
};

module.exports = {
    getAllUsers,
    AllUsersWithRoles,
    checkEmail,
    signup,
    login,
    getUserById,
    updateUser,
    resetPassword,
    deleteUser,
    requestSalaryAdvance,
    getUserDetails,
    createSupportTicket,
    approveUser,
    rejectUser,
};
