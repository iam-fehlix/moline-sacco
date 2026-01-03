const { pool } = require("../config/database");
const axios = require("axios");
const { shareholderCapitalPaymentEmail } = require("../utils/mailer");

const MPESA_BASE_URL = "https://sandbox.safaricom.co.ke";
const CONSUMER_KEY = "4AcLqTCEyOfGqrv8IfRlXlFfpGibbug6Gjk0XMetlRypvWFw";
const CONSUMER_SECRET =
  "rNIbmLA8Supok5cedFhQUDG4EWobwqzFnT7o1MwFDrGMth1r8lH9mPU7WeOmPsft";
const SHORTCODE = "174379";
const PASSKEY =
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

// MPESA access token
const getMpesaAccessToken = async () => {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString(
    "base64"
  );
  const response = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );
  return response.data.access_token;
};

const getTimestamp = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const convertPhoneNumber = (phone) => {
  if (phone.startsWith("0")) {
    return "254" + phone.substring(1);
  }
  return phone;
};
// initiate MPESA STK Push
const initiateMpesaSTKPush = async (phone, amount, accountNumber) => {
  try {
    const accessToken = await getMpesaAccessToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString(
      "base64"
    );
    const internationalPhone = convertPhoneNumber(phone);

    const requestBody = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: internationalPhone,
      PartyB: SHORTCODE,
      PhoneNumber: internationalPhone,
      CallBackURL:
        "https://r4rkmp9x-5000.inc1.devtunnels.ms/api/finance/mpesaCallback",
      AccountReference: accountNumber,
      TransactionDesc: "Payment for matatu operations",
    };

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error processing payment:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

//savings for a given vehicle
const getSavings = async (matatu_id) => {
  try {
    const savingsQuery = `
      SELECT COALESCE(SUM(amount), 0) AS total_savings
      FROM savings
      WHERE matatu_id = ?
    `;
    const [result] = await pool.query(savingsQuery, [matatu_id]);
    
    const totalSavings = result && result.length > 0 ? result[0].total_savings : 0;
    console.log(`Savings for matatu ${matatu_id}: ${totalSavings}`);
    return totalSavings;
  } catch (error) {
    console.error("Error fetching total savings:", error);
    throw error;
  }
};

// FIXED: async/await consistency and proper error handling
const getTotalSavings = async (req, res) => {
  const userId = req.userId;
  
  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }

  try {
    const sql = `
      SELECT COALESCE(SUM(amount), 0) AS totalSavings 
      FROM savings 
      WHERE user_id = ?
    `;
    const [results] = await pool.query(sql, [userId]);
    
    const totalSavings = results && results.length > 0 ? results[0].totalSavings : 0;
    console.log(`Total savings for user ${userId}: ${totalSavings}`);
    res.json({ totalSavings: totalSavings, userId: userId });
  } catch (error) {
    console.error("Error fetching total savings:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// loans for a given vehicle
const getLoans = (req, res) => {
  const { matatuId } = req.params;

  const sql =
    "SELECT loan_id, loan_type, amount_issued, amount_due FROM loans WHERE matatu_id = ?";
  pool.query(sql, [matatuId], (error, results) => {
    if (error) {
      console.error("Error fetching loans:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json(results);
  });
};

// insurance details for a given vehicle
const getInsurance = (req, res) => {
  const { matatuId } = req.params;

  const sql =
    "SELECT insurance_id, insurance_type, insurance_company, insurance_expiry FROM insurance WHERE matatu_id = ?";
  pool.query(sql, [matatuId], (error, results) => {
    if (error) {
      console.error("Error fetching insurance:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json(results[0]);
  });
};

// payments for a given vehicle
const getPayments = (req, res) => {
  const { matatuId } = req.params;

  const sql =
    "SELECT payment_id, amount_paid, transaction_code, payment_date FROM payments WHERE matatu_id = ?";
  pool.query(sql, [matatuId], (error, results) => {
    if (error) {
      console.error("Error fetching payments:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json(results);
  });
};

// Function to request a loan for a given vehicle
const loanRequest = async (req, res) => {
  const userId = req.userId;
  const { matatuId, loanAmount, loanType, guarantors } = req.body;
  // FIXED: Using async/await, proper validation of all fields
  
  if (!userId || !matatuId || !loanAmount || !loanType) {
    console.warn("Loan request missing fields:", { userId, matatuId, loanAmount, loanType });
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let parsedGuarantors = [];
    if (loanType === "emergency" && guarantors) {
      try {
        parsedGuarantors = typeof guarantors === 'string' ? JSON.parse(guarantors) : guarantors;
      } catch (error) {
        console.error("Invalid guarantors format:", error);
        return res.status(400).json({ error: "Invalid guarantors format" });
      }
    }

    // Insert loan (amount_issued=0 indicates pending, >0 indicates approved)
    const applyLoanQuery =
      "INSERT INTO loans (user_id, matatu_id, amount_applied, amount_issued, amount_due, loan_type) VALUES (?, ?, ?, 0, 0, ?)";
    
    const [result] = await pool.query(
      applyLoanQuery,
      [userId, matatuId, loanAmount, loanType]
    );

    const loanId = result.insertId;
    console.log(`Loan request created - ID: ${loanId}, User: ${userId}, Amount: ${loanAmount}`);

    // Insert guarantors if needed
    if (loanType === "emergency" && parsedGuarantors.length > 0) {
      const guarantorValues = parsedGuarantors.map((guarantorId) => [loanId, guarantorId]);
      const insertGuarantorsQuery = "INSERT INTO guarantors (loan_id, guarantor_id) VALUES ?";
      await pool.query(insertGuarantorsQuery, [guarantorValues]);
    }

    res.status(201).json({
      message: "Loan application submitted successfully",
      loanId: loanId,
      hasGuarantors: parsedGuarantors.length > 0
    });
  } catch (error) {
    console.error("Error applying for loan:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// Function to approve a loan for a given vehicle
const approveLoan = async (req, res) => {
  const { loanId, amountIssued, matatuId } = req.body;
  // FIXED: async/await, proper amount_due initialization

  if (!loanId || !amountIssued || !matatuId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const getLoanDetailsQuery =
      "SELECT user_id, amount_applied, amount_issued FROM loans WHERE loan_id = ?";
    const [loanResult] = await pool.query(getLoanDetailsQuery, [loanId]);

    if (!loanResult || loanResult.length === 0) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Prevent approving a loan that is already approved (amount_issued > 0)
    const currentAmountIssued = loanResult[0].amount_issued;
    if (currentAmountIssued > 0) {
      console.warn(`Attempt to approve loan ${loanId} that is already approved (amount_issued=${currentAmountIssued})`);
      return res.status(400).json({ error: 'Loan already approved' });
    }

    const { user_id: userId, amount_applied: amountApplied } = loanResult[0];

    if (amountIssued > amountApplied) {
      console.warn(`Loan approval rejected - Issued (${amountIssued}) > Applied (${amountApplied})`);
      return res.status(400).json({ error: "Amount issued exceeds applied amount" });
    }

    // FIXED: Set amount_due = amount_issued (equal initially for repayment tracking)
    const updateLoanQuery =
      "UPDATE loans SET amount_issued = ?, amount_due = ? WHERE loan_id = ?";
    
    await pool.query(updateLoanQuery, [amountIssued, amountIssued, loanId]);
    console.log(`Loan approved - ID: ${loanId}, Issued: ${amountIssued}, Due: ${amountIssued}`);

    res.status(200).json({
      message: "Loan approved successfully",
      loanId: loanId,
      amountIssued: amountIssued,
      status: "approved"
    });
  } catch (error) {
    console.error("Error approving loan:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// Function to get pending loans for a given vehicle
const getPendingLoans = async (req, res) => {
  const userId = req.userId;
  
  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }

  // FIXED: async/await consistency with comprehensive data
  try {
    const pendingLoansQuery = `
      SELECT 
        loan_id, 
        loan_type, 
        amount_applied, 
        amount_issued, 
        amount_due,
        matatu_id, 
        created_at
      FROM loans 
      WHERE user_id = ? AND (amount_issued = 0 OR amount_issued IS NULL)
      ORDER BY created_at DESC
    `;

    const [results] = await pool.query(pendingLoansQuery, [userId]);
    console.log(`Found ${results ? results.length : 0} pending loans for user ${userId}`);
    res.json(results || []);
  } catch (error) {
    if (error) {
      console.error("Error fetching pending loans:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  }
};

// FIXED: async/await for admin approval view
const getAllPendingLoans = async (req, res) => {
  // FIXED: Returns all pending loans with user details for admin approval
  try {
    const pendingLoansQuery = `
      SELECT 
        loan_id, 
        user_id,
        loan_type, 
        amount_applied, 
        amount_issued,
        amount_due,
        matatu_id,
        created_at
      FROM loans 
      WHERE amount_issued = 0 OR amount_issued IS NULL
      ORDER BY created_at ASC
    `;

    const [results] = await pool.query(pendingLoansQuery);
    console.log(`Found ${results ? results.length : 0} pending loans for approval`);
    res.json(results || []);
  } catch (error) {
    if (error) {
      console.error("Error fetching pending loans:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  }
};

const checkLoanEligibility = async (req, res) => {
  const userId = req.userId;
  const { matatu_id } = req.query;

  // FIXED: Better validation
  if (!userId || !matatu_id) {
    return res.status(400).json({ error: "User ID and matatu_id required" });
  }

  try {
    // Check if user paid share capital (status = 'approved')
    const shareCapitalQuery = `
      SELECT user_id, status 
      FROM users 
      WHERE user_id = ? AND status = 'approved'
    `;
    const [shareCapitalResult] = await pool.query(shareCapitalQuery, [userId]);
    const shareCapitalPaid = shareCapitalResult && shareCapitalResult.length > 0;

    if (!shareCapitalPaid) {
      console.log(`Share capital not paid for user ${userId}`);
      return res.status(400).json({ error: "Share capital payment required" });
    }

    // Get total savings for the matatu
    const totalSavings = await getSavings(matatu_id);

    // Check for outstanding loans
    const outstandingLoanQuery = `
      SELECT COUNT(*) AS active_loans, COALESCE(SUM(amount_due), 0) AS total_due
      FROM loans
      WHERE matatu_id = ? AND amount_due > 0
    `;
    const [loanResult] = await pool.query(outstandingLoanQuery, [matatu_id]);
    
    // FIXED: Better handling of loan results
    const loanData = loanResult && loanResult.length > 0 ? loanResult[0] : { active_loans: 0, total_due: 0 };
    const hasOutstandingLoan = loanData.active_loans > 0;

    // Determine eligibility: share capital + no outstanding loan + positive savings
    const eligibleForLoan = shareCapitalPaid && !hasOutstandingLoan && totalSavings > 0;

    const eligibilityStatus = {
      userId: userId,
      matatu_id: matatu_id,
      shareCapitalPaid: shareCapitalPaid,
      savings: totalSavings,
      hasOutstandingLoan: hasOutstandingLoan,
      outstandingAmount: loanData.total_due,
      activeLoans: loanData.active_loans,
      eligibleForLoan: eligibleForLoan,
      reason: !shareCapitalPaid ? "Share capital not paid" : hasOutstandingLoan ? "Outstanding loan must be repaid" : totalSavings <= 0 ? "No savings available" : "Eligible for loan"
    };

    console.log(`Loan eligibility check - User: ${userId}, Matatu: ${matatu_id}, Eligible: ${eligibleForLoan}`);
    res.json(eligibilityStatus);
  } catch (error) {
    console.error("Error checking loan eligibility:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

const getTotalLoans = async (req, res) => {
  const userId = req.userId;
  
  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }

  try {
    const sql = `
      SELECT 
        COALESCE(SUM(amount_due), 0) AS totalLoans,
        COALESCE(SUM(amount_issued), 0) AS totalIssued,
        COUNT(*) AS loanCount
      FROM loans 
      WHERE user_id = ? AND amount_due > 0
    `;
    const [results] = await pool.query(sql, [userId]);
    
    const loanData = results && results.length > 0 ? results[0] : { totalLoans: 0, totalIssued: 0, loanCount: 0 };
    console.log(`Total loans for user ${userId}: ${loanData.totalLoans} (${loanData.loanCount} loans)`);
    res.json(loanData);
  } catch (error) {
    console.error("Error fetching total loans:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

  // Returns financial aggregates for a matatu: savings, outstanding loans, insurance, operations
  const getFinancialStatus = async (req, res) => {
    const matatu_id = req.query.matatu_id || req.params.matatuId || req.body.matatu_id;
    if (!matatu_id) return res.status(400).json({ error: 'matatu_id required' });
    try {
      const savingsSql = `SELECT COALESCE(SUM(amount),0) AS totalSavings FROM savings WHERE matatu_id = ?`;
      const [savingsRows] = await pool.query(savingsSql, [matatu_id]);
      const totalSavings = savingsRows && savingsRows.length > 0 ? savingsRows[0].totalSavings : 0;

      const loansSql = `SELECT COALESCE(SUM(amount_due),0) AS totalOutstanding FROM loans WHERE matatu_id = ? AND amount_due > 0`;
      const [loanRows] = await pool.query(loansSql, [matatu_id]);
      const totalOutstanding = loanRows && loanRows.length > 0 ? loanRows[0].totalOutstanding : 0;

      const paymentsSql = `SELECT COALESCE(SUM(insurance),0) AS totalInsurance, COALESCE(SUM(operations),0) AS totalOperations FROM payments WHERE matatu_id = ?`;
      const [paymentRows] = await pool.query(paymentsSql, [matatu_id]);
      const totalInsurance = paymentRows && paymentRows.length > 0 ? paymentRows[0].totalInsurance : 0;
      const totalOperations = paymentRows && paymentRows.length > 0 ? paymentRows[0].totalOperations : 0;

      console.log(`Financial status for matatu ${matatu_id}: savings=${totalSavings}, outstanding=${totalOutstanding}`);
      res.json({ matatu_id, totalSavings, totalOutstanding, totalInsurance, totalOperations });
    } catch (error) {
      console.error('Error fetching financial status:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  };

const latestPayments = (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const query = `
        SELECT 
            payment_id,
            user_id,
            matatu_id,
            amount_paid,
            transaction_code,
            created_at,
            loan,
            savings,
            insurance,
            operations
        FROM payments
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    `;

  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching payments:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json({ payments: results });
  });
};

const checkOutstandingLoan = async (matatu_id) => {
  try {
    // FIXED: Returns full loan object with loan_id, not just amount_due
    const loanQuery = `
      SELECT loan_id, amount_due, amount_issued 
      FROM loans 
      WHERE matatu_id = ? AND amount_due > 0 AND amount_issued > 0
      ORDER BY loan_id DESC 
      LIMIT 1
    `;
    const [rows] = await pool.query(loanQuery, [matatu_id]);

    if (rows && rows.length > 0) {
      console.log(`Outstanding loan - ID: ${rows[0].loan_id}, Due: ${rows[0].amount_due}`);
      return rows[0]; // FIXED: Return full object with loan_id
    } else {
      console.log(`No outstanding loan for matatu ${matatu_id}`);
      return null; // FIXED: Return null instead of 0
    }
  } catch (error) {
    console.error("Error checking outstanding loan:", error);
    throw error;
  }
};

const shareholderPayment = async (req, res) => {
  const { amount, phone, user, email } = req.body; 
  const userId = req.userId;   

  try {
    // Initiate MPESA STK Push
    const mpesaResponse = await initiateMpesaSTKPush(
      phone,
      amount,
      user
    );

    if (mpesaResponse.ResponseCode !== "0") {
      return res.status(500).json({ error: "Failed to initiate MPESA payment" });
    }
    // STK Push initiated successfully; defer finalization to MPESA callback
    console.log(`Shareholder STK push initiated for user ${userId}, CheckoutRequestID: ${mpesaResponse.CheckoutRequestID}`);
    res.json({ message: "STK Push initiated. Awaiting MPESA confirmation.", CheckoutRequestID: mpesaResponse.CheckoutRequestID });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const paymentProcessing = async (req, res) => {
  const { amount, phone, vehicleRegistrationNumber, matatu_id } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!amount || !phone || !matatu_id) {
    return res.status(400).json({ error: "Missing required fields: amount, phone, matatu_id" });
  }

  try {
    // Initiate MPESA STK Push
    const mpesaResponse = await initiateMpesaSTKPush(
      phone,
      amount,
      vehicleRegistrationNumber
    );

    if (mpesaResponse.ResponseCode !== "0") {
      return res
        .status(500)
        .json({ error: "Failed to initiate MPESA payment" });
    }

    // Store payment context for callback to retrieve
    const CheckoutRequestID = mpesaResponse.CheckoutRequestID;
    const mpesaStkQuery = `
      INSERT INTO mpesastk (CheckoutRequestID, user_id, matatu_id, amount, mpesastk_status, created_at)
      VALUES (?, ?, ?, ?, 'pending', NOW())
      ON DUPLICATE KEY UPDATE mpesastk_status = 'pending'
    `;
    await pool.query(mpesaStkQuery, [CheckoutRequestID, userId, matatu_id, amount]);

    // Store CheckoutRequestID - payment completion handled by mpesaCallback
    console.log(`STK Push initiated for user ${userId}, matatu ${matatu_id}, amount ${amount}, CheckoutRequestID: ${CheckoutRequestID}`);
    res.json({ 
      message: "STK Push initiated. Awaiting MPESA confirmation.", 
      CheckoutRequestID: CheckoutRequestID 
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// MPESA callback endpoint
const mpesaCallback = async (req, res) => {
  const {
    Body: { stkCallback },
  } = req;
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;
  console.log("MPESA Callback received - CheckoutRequestID:", CheckoutRequestID, "ResultCode:", ResultCode);

  if (ResultCode === 1032) {
    // Payment canceled
    console.error("Payment canceled by user");
    const updateMpesaStkQuery = `
            UPDATE mpesastk SET mpesastk_status = 'canceled', ResultCode = ?, ResultDesc = ?
            WHERE CheckoutRequestID = ?
        `;
    await pool.query(updateMpesaStkQuery, [
      ResultCode,
      "Payment canceled by user",
      CheckoutRequestID,
    ]);
    return res.json({ ResponseCode: 0 }); // Acknowledge to MPESA
  }

  if (ResultCode !== 0) {
    // Payment failed
    console.error("Payment failed with result code:", ResultCode);
    const updateMpesaStkQuery = `
            UPDATE mpesastk SET mpesastk_status = 'failed', ResultCode = ?, ResultDesc = ?
            WHERE CheckoutRequestID = ?
        `;
    await pool.query(updateMpesaStkQuery, [ResultCode, "Payment failed", CheckoutRequestID]);
    return res.json({ ResponseCode: 0 }); // Acknowledge to MPESA
  }

  // Payment successful
  try {
    const mpesaReceiptNumber = CallbackMetadata.Item.find(
      (item) => item.Name === "MpesaReceiptNumber"
    )?.Value;
    const amount = CallbackMetadata.Item.find(
      (item) => item.Name === "Amount"
    )?.Value;

    if (!mpesaReceiptNumber || !amount) {
      console.error("Missing MPESA receipt or amount in callback");
      return res.json({ ResponseCode: 0 }); // Acknowledge but log issue
    }

    // Get user and matatu info from payment processing context (stored during STK push)
    const [paymentContext] = await pool.query(
      "SELECT user_id, matatu_id FROM mpesastk WHERE CheckoutRequestID = ? LIMIT 1",
      [CheckoutRequestID]
    );

    if (!paymentContext || paymentContext.length === 0) {
      console.error("No payment context found for CheckoutRequestID:", CheckoutRequestID);
      return res.json({ ResponseCode: 0 }); // Acknowledge
    }

    const userId = paymentContext[0].user_id;
    const matatu_id = paymentContext[0].matatu_id;

    // Parse payment allocation: Operations -> Insurance -> Loan -> Savings
    let operations = Math.min(amount, 250);
    let remainingAmount = amount - operations;

    let insurance = Math.min(remainingAmount, 250);
    remainingAmount -= insurance;

    // Check for outstanding loan and allocate remaining to loan/savings
    const outstandingLoan = await checkOutstandingLoan(matatu_id);
    let loanPayment = 0;
    let loanId = null;

    if (outstandingLoan) {
      loanPayment = Math.min(remainingAmount, outstandingLoan.amount_due);
      loanId = outstandingLoan.loan_id;
      remainingAmount -= loanPayment;

      // Update loan amount due
      const newAmountDue = outstandingLoan.amount_due - loanPayment;
      const updateLoanQuery = "UPDATE loans SET amount_due = ? WHERE loan_id = ?";
      await pool.query(updateLoanQuery, [newAmountDue, loanId]);
    }

    const savings = remainingAmount;

    // Insert savings record if applicable
    if (savings > 0) {
      const insertSavingsQuery = `
          INSERT INTO savings (user_id, matatu_id, amount, created_at)
          VALUES (?, ?, ?, NOW())
        `;
      await pool.query(insertSavingsQuery, [userId, matatu_id, savings]);
    }

    // Insert payment record
    const paymentQuery = `
      INSERT INTO payments (payment_id, user_id, matatu_id, amount_paid, transaction_code, loan, savings, operations, insurance, CheckoutRequestID, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const paymentId = generatePaymentId();

    await pool.query(paymentQuery, [
      paymentId,
      userId,
      matatu_id,
      amount,
      mpesaReceiptNumber,
      loanPayment,
      savings,
      operations,
      insurance,
      CheckoutRequestID,
    ]);

    // Update mpesastk table for the successful transaction
    const updateMpesaStkQuery = `
            UPDATE mpesastk SET mpesastk_status = 'successful', ResultCode = ?, ResultDesc = ?, MpesaReceiptNumber = ?
            WHERE CheckoutRequestID = ?
        `;
    await pool.query(updateMpesaStkQuery, [
      ResultCode,
      "Payment successful",
      mpesaReceiptNumber,
      CheckoutRequestID,
    ]);

    console.log(`Payment confirmed - user:${userId} matatu:${matatu_id} amount:${amount} loan:${loanPayment} savings:${savings} operations:${operations} insurance:${insurance}`);
    res.json({ ResponseCode: 0 }); // Acknowledge successful to MPESA
  } catch (error) {
    console.error("Error processing MPESA callback:", error);
    res.json({ ResponseCode: 0 }); // Always acknowledge to MPESA
  }
};

const checkPaymentStatus = async (req, res) => {
  const { CheckoutRequestID } = req.query;

  try {
    if (!CheckoutRequestID) {
      return res.status(400).json({ error: "CheckoutRequestID required" });
    }
    
    // Query database for payment status
    const [results] = await pool.query(
      "SELECT payment_id, transaction_code, amount_paid, created_at FROM payments WHERE CheckoutRequestID = ?",
      [CheckoutRequestID]
    );
    
    if (results && results.length > 0) {
      const payment = results[0];
      res.json({
        status: "completed",
        paymentId: payment.payment_id,
        mpesaReceiptNumber: payment.transaction_code,
        amountPaid: payment.amount_paid,
        completedAt: payment.created_at
      });
    } else {
      // Payment not yet confirmed
      res.json({ status: "pending", message: "Payment confirmation awaited" });
    }
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

const generatePaymentId = () => {
  return Date.now();
};

module.exports = {
  getSavings,
  getLoans,
  getInsurance,
  getPayments,
  loanRequest,
  approveLoan,
  getPendingLoans,
  getAllPendingLoans,
  paymentProcessing,
  checkLoanEligibility,
  getTotalLoans,
  getFinancialStatus,
  getTotalSavings,
  latestPayments,
  mpesaCallback,
  checkPaymentStatus,
  shareholderPayment
};
