const { pool } = require('../config/database');

const getMatatusDetails = async (req, res) => {
    try {
        const sql = `
            SELECT 
                m.matatu_id, 
                m.number_plate, 
                m.status,
                driver.first_name AS driver_first_name, 
                driver.last_name AS driver_last_name,
                owner.first_name AS owner_first_name,
                owner.last_name AS owner_last_name,
                COALESCE(s.savings, 0) AS savings,
                COALESCE(l.loan_amount, 0) AS loan,
                i.insurance_expiry AS insurance_expiry
            FROM matatus m
            LEFT JOIN users driver ON m.driver_id = driver.user_id
            LEFT JOIN users owner ON m.owner_id = owner.user_id
            LEFT JOIN (
                SELECT matatu_id, MAX(amount) AS savings
                FROM savings 
                GROUP BY matatu_id
            ) s ON m.matatu_id = s.matatu_id
            LEFT JOIN (
                SELECT matatu_id, MAX(amount_due) AS loan_amount
                FROM loans 
                GROUP BY matatu_id
            ) l ON m.matatu_id = l.matatu_id
            LEFT JOIN (
                SELECT matatu_id, MAX(insurance_expiry) AS insurance_expiry
                FROM insurance 
                GROUP BY matatu_id
            ) i ON m.matatu_id = i.matatu_id
        `;
        
        const [results] = await pool.query(sql);
        res.json(results);
    } catch (error) {
        console.error('Error fetching matatus data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getFinancialDetails = async (req, res) => {
    try {
        const query = `
            SELECT
                matatus.number_plate,
                MAX(loans.amount_issued) AS loan_amount_issued,
                MAX(loans.amount_due) AS loan_amount_due,
                loans.loan_type,
                MAX(loans.created_at) AS loan_created_at,
                loans.loan_id,
                MAX(savings.amount) AS savings_amount, 
                MAX(insurance.amount) AS insurance_amount,
                insurance.insurance_company,
                insurance.policy_number,
                MAX(insurance.insurance_expiry) AS insurance_expiry
            FROM
                matatus
            LEFT JOIN loans ON matatus.matatu_id = loans.matatu_id
            LEFT JOIN savings ON matatus.matatu_id = savings.matatu_id
            LEFT JOIN insurance ON matatus.matatu_id = insurance.matatu_id
            GROUP BY matatus.matatu_id, loans.loan_id, insurance.insurance_company, insurance.policy_number;
        `;
        
        const [results] = await pool.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching financial data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getMatatusDetails,
    getFinancialDetails,
};
