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
    if (result && result.length > 0) {
      console.log("Total savings:", result[0].total_savings);
      return result[0].total_savings;
    } else {
      return 0;
    }
  } catch (error) {
    console.error("Error fetching total savings:", error);
    throw error;
  }
};

const getTotalSavings = (req, res) => {
  const userId = req.userId;
  const sql =
    "SELECT SUM(amount) AS totalSavings FROM savings WHERE user_id = ?";
  pool.query(sql, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching total savings:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results[0]);
  });
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
const loanRequest = (req, res) => {
  const userId = req.userId;
  const { matatuId, loanAmount, loanType, guarantors } = req.body;
  console.log("matatu_id", matatuId);

  if (!loanAmount || !loanType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  let parsedGuarantors = [];
  if (loanType === "emergency" && guarantors) {
    try {
      parsedGuarantors = JSON.parse(guarantors);
    } catch (error) {
      return res.status(400).json({ error: "Invalid guarantors format" });
    }
  }

  const applyLoanQuery =
    "INSERT INTO loans (user_id, matatu_id, amount_applied, loan_type) VALUES (?, ?, ?, ?)";

  pool.query(
    applyLoanQuery,
    [userId, matatuId, loanAmount, loanType],
    (error, results) => {
      if (error) {
        console.error("Error applying for loan:", error);
        return res.status(500).json({ error: "Internal server error" });
      }

      const loanId = results.insertId;

      if (loanType === "emergency" && parsedGuarantors.length > 0) {
        const guarantorValues = parsedGuarantors.map((guarantorId) => [
          loanId,
          guarantorId,
        ]);
        const insertGuarantorsQuery =
          "INSERT INTO guarantors (loan_id, guarantor_id) VALUES ?";

        pool.query(
          insertGuarantorsQuery,
          [guarantorValues],
          (guarantorError) => {
            if (guarantorError) {
              console.error(
                "Error inserting guarantor details:",
                guarantorError
              );
              return res.status(500).json({ error: "Internal server error" });
            }

            res.status(201).json({
              message:
                "Loan application submitted successfully with guarantors",
            });
          }
        );
      } else {
        res
          .status(201)
          .json({ message: "Loan application submitted successfully" });
      }
    }
  );
};

// Function to approve a loan for a given vehicle
const approveLoan = (req, res) => {
  const { loanId, amountIssued, matatuId } = req.body;
  console.log(matatuId);

  if (!loanId || !amountIssued || !matatuId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const getLoanDetailsQuery =
    "SELECT user_id, amount_applied FROM loans WHERE loan_id = ?";
  const updateLoanQuery =
    "UPDATE loans SET amount_issued = ?, amount_due = amount_due + ? WHERE loan_id = ?";
  const insertSavingsQuery = `
        INSERT INTO savings (user_id, matatu_id, amount, created_at)
        VALUES (?, ?, ?, NOW())
    `;

  pool.query(getLoanDetailsQuery, [loanId], (error, loanResult) => {
    if (error) {
      console.error("Error fetching loan details:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (loanResult.length === 0) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const { user_id: userId, amount_applied: amountApplied } = loanResult[0];

    if (amountIssued > amountApplied) {
      return res
        .status(400)
        .json({ error: "Amount issued exceeds applied amount" });
    }

    pool.query(
      updateLoanQuery,
      [amountIssued, amountIssued, loanId],
      (error) => {
        if (error) {
          console.error("Error updating loan:", error);
          return res.status(500).json({ error: "Internal server error" });
        }

        // Insert a new record into the savings table with the issued amount as a negative value
        pool.query(
          insertSavingsQuery,
          [userId, matatuId, -amountIssued],
          (error) => {
            if (error) {
              console.error("Error inserting savings record:", error);
              return res.status(500).json({ error: "Internal server error" });
            }

            res.status(200).json({
              message: "Loan approved and savings record inserted successfully",
            });
          }
        );
      }
    );
  });
};

// Function to get pending loans for a given vehicle
const getPendingLoans = (req, res) => {
  const userId = req.userId;

  const pendingLoansQuery =
    "SELECT loan_id, loan_type, amount_applied, matatu_id FROM loans WHERE amount_issued = 0 AND user_id = ?";

  pool.query(pendingLoansQuery, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching pending loans:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
};

// Function to get all pending loans
const getAllPendingLoans = (req, res) => {
  const pendingLoansQuery =
    "SELECT loan_id, loan_type, amount_applied FROM loans WHERE amount_issued = 0";

  pool.query(pendingLoansQuery, (error, results) => {
    if (error) {
      console.error("Error fetching pending loans:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json(results);
  });
};

const checkLoanEligibility = async (req, res) => {
  const userId = req.userId;
  const { matatu_id } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Unauthorized" });
  }

  try {
    // Check if share capital is paid
    const shareCapitalQuery = `
            SELECT status 
            FROM users 
            WHERE user_id = ? AND status = 'approved'
        `;
    const [shareCapitalResult] = await pool.query(shareCapitalQuery, [userId]);

    if (shareCapitalResult.length === 0) {
      return res.status(400).json({ error: "Share capital not paid" });
    }

    // Get total savings for the matatu
    const totalSavings = await getSavings(matatu_id);

    // Check for outstanding loans (outstanding amount > 0)
    const outstandingLoanQuery = `
    SELECT COUNT(*) AS active_loans
    FROM loans
    WHERE matatu_id = ? AND amount_due > 0
    `;
    const [loanResult] = await pool.query(outstandingLoanQuery, [matatu_id]);

    // Ensure loanResult is not empty
    const hasOutstandingLoan =
      loanResult && loanResult.length > 0 && loanResult[0].active_loans > 0;

    // Determine eligibility
    const eligibilityStatus = {
      savings: totalSavings,
      shareCapitalPaid: true,
      hasOutstandingLoan: hasOutstandingLoan,
      eligibleForLoan: !hasOutstandingLoan && totalSavings > 0,
    };

    res.json(eligibilityStatus);
  } catch (error) {
    console.error("Error checking loan eligibility:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTotalLoans = (req, res) => {
  const userId = req.userId;
  const sql =
    "SELECT SUM(amount_due) AS totalLoans FROM loans WHERE user_id = ?";
  pool.query(sql, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching total loans:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results[0]);
  });
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
    const loanQuery = "SELECT amount_due FROM loans WHERE matatu_id = ?";
    const [rows] = await pool.query(loanQuery, [matatu_id]);

    if (rows && rows.length > 0 && rows[0].amount_due > 0) {
      console.log("Outstanding loan:", rows[0].amount_due);
      return rows[0].amount_due; // Return the outstanding loan amount
    } else {
      return 0; // No outstanding loan
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

    // Hardcoded data to simulate a successful transaction
    const mpesaReceiptNumber = "MPESA123456";

    // Insert payment record
    const paymentQuery = `
            INSERT INTO payments (payment_id, user_id, amount_paid, transaction_code, CheckoutRequestID)
            VALUES (?, ?, ?, ?, ?)
        `;
    const paymentId = generatePaymentId();

    await pool.query(paymentQuery, [
      paymentId,
      userId,
      amount,
      mpesaReceiptNumber,
      mpesaResponse.CheckoutRequestID,
    ]);

    // Update user status to 'approved'
    const updateUserStatusQuery = `
            UPDATE Users
            SET status = 'approved'
            WHERE user_id = ?
        `;
    await pool.query(updateUserStatusQuery, [userId]);
    shareholderCapitalPaymentEmail(email, user);

    res.json({ message: "Payment processed successfully, enjoy our services!!!", mpesaReceiptNumber });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const paymentProcessing = async (req, res) => {
  const { amount, phone, vehicleRegistrationNumber, matatu_id } = req.body;

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

    // Hardcoded data to simulate a successful transaction
    const mpesaReceiptNumber = "MPESA123456";
    const operations = amount < 250 ? amount : 250;
    let remainingAmount = amount - operations;
    const insurance = remainingAmount < 250 ? remainingAmount : 250;
    remainingAmount -= insurance;

    // Check for outstanding loan
    const outstandingLoan = await checkOutstandingLoan(matatu_id);

    let loanPayment = 0;
    let savingsAmount = 0;

    if (outstandingLoan > 0) {
      // Prioritize loan repayment
      loanPayment =
        remainingAmount > outstandingLoan ? outstandingLoan : remainingAmount;
      remainingAmount -= loanPayment;
      savingsAmount = remainingAmount;

      // Update loan amount due
      const updateLoanQuery =
        "UPDATE loans SET amount_due = amount_due - ? WHERE matatu_id = ?";
      await pool.query(updateLoanQuery, [loanPayment, matatu_id]);

      // Insert payment record into loan_payments table
      const insertLoanPaymentQuery = `
                INSERT INTO loan_payments (loan_id, amount_paid, mpesa_receipt_number)
                VALUES (?, ?, ?)
            `;
      await pool.query(insertLoanPaymentQuery, [
        outstandingLoan.loan_id,
        loanPayment,
        mpesaReceiptNumber,
      ]);

      // Check if the loan is fully paid
      const loanStatusQuery = "SELECT amount_due FROM loans WHERE loan_id = ?";
      const [loan] = await pool.query(loanStatusQuery, [
        outstandingLoan.loan_id,
      ]);

      if (loan.length > 0 && loan[0].amount_due <= 0) {
        // Update loan status to fully_paid
        const updateStatusQuery =
          'UPDATE loans SET status = "fully_paid" WHERE loan_id = ?';
        await pool.query(updateStatusQuery, [outstandingLoan.loan_id]);
      }
    } else {
      // No loan, add to savings
      savingsAmount = remainingAmount;
    }

    // Insert savings record if savingsAmount > 0
    if (savingsAmount > 0) {
      const insertSavingsQuery = `
                INSERT INTO savings (user_id, payment_id, matatu_id, amount)
                VALUES (?, ?, ?, ?)
            `;
      const userId = req.userId;
      const paymentId = generatePaymentId(); // Generate a unique payment ID
      await pool.query(insertSavingsQuery, [
        userId,
        paymentId,
        matatu_id,
        savingsAmount,
      ]);
    }

    // Insert payment record
    const paymentQuery = `
            INSERT INTO payments (payment_id, user_id, loan, savings, matatu_id, amount_paid, transaction_code, operations, insurance, CheckoutRequestID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    const paymentId = generatePaymentId();
    const userId = req.userId;

    await pool.query(paymentQuery, [
      paymentId,
      userId,
      loanPayment,
      savingsAmount,
      matatu_id,
      amount,
      mpesaReceiptNumber,
      operations,
      insurance,
      mpesaResponse.CheckoutRequestID,
    ]);

    // Insert initial data into mpesastk table
    const mpesaStkQuery = `
            INSERT INTO mpesastk (mpesastk_id, mpesastk_status, ResultCode, ResultDesc, MpesaReceiptNumber, mpesastk_appid)
            VALUES (NULL, 'successful', '0', 'Payment successful', ?, ?)
        `;
    await pool.query(mpesaStkQuery, [mpesaReceiptNumber, matatu_id]);

    res.json({ message: "Payment processed successfully", mpesaReceiptNumber });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// MPESA callback endpoint
const mpesaCallback = async (req, res) => {
  const {
    Body: { stkCallback },
  } = req;
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;
  console.log("result code: ", ResultCode);

  if (ResultCode === 1032) {
    // Payment canceled
    console.error("Payment canceled by user");
    const updateMpesaStkQuery = `
            UPDATE mpesastk SET mpesastk_status = 'canceled', ResultCode = ?, ResultDesc = ?, CheckoutRequestID
            WHERE mpesastk_id = (SELECT mpesastk_id FROM (SELECT mpesastk_id FROM mpesastk ORDER BY mpesastk_id DESC LIMIT 1) AS sub)
        `;
    await pool.query(updateMpesaStkQuery, [
      ResultCode,
      "Payment canceled by user",
      CheckoutRequestID,
    ]);
    return res.status(400).json({ error: "Payment canceled by user" });
  }

  if (ResultCode !== 0) {
    // Payment failed
    console.error("Payment failed with result code:", ResultCode);
    const updateMpesaStkQuery = `
            UPDATE mpesastk SET mpesastk_status = 'failed', ResultCode = ?, ResultDesc = ?
            WHERE mpesastk_id = (SELECT mpesastk_id FROM (SELECT mpesastk_id FROM mpesastk ORDER BY mpesastk_id DESC LIMIT 1) AS sub)
        `;
    await pool.query(updateMpesaStkQuery, [ResultCode, "Payment failed"]);
    return res.status(500).json({ error: "Payment failed" });
  }

  // Payment successful
  const mpesaReceiptNumber = CallbackMetadata.Item.find(
    (item) => item.Name === "MpesaReceiptNumber"
  ).Value;
  const amount = CallbackMetadata.Item.find(
    (item) => item.Name === "Amount"
  ).Value;
  const matatu_id = req.query.matatu_id;

  try {
    const loanQuery = "SELECT * FROM loans WHERE matatu_id = ?";
    const [loanRows] = await pool.query(loanQuery, [matatu_id]);
    const loan = loanRows.length > 0 ? loanRows[0].amount_due : 0;

    let operations = 0;
    let insurance = 0;
    let loanPayment = 0;
    let savings = 0;

    if (amount < 250) {
      operations = amount;
    } else {
      operations = 250;
      let remainingAmount = amount - 250;

      if (remainingAmount < 250) {
        insurance = remainingAmount;
      } else {
        insurance = 250;
        remainingAmount -= 250;

        if (loan > 0) {
          if (remainingAmount >= loan) {
            loanPayment = loan;
            remainingAmount -= loan;
          } else {
            loanPayment = remainingAmount;
            remainingAmount = 0;
          }
        }

        savings = remainingAmount;
      }
    }

    if (loan > 0 && loanPayment > 0) {
      const updateLoanQuery =
        "UPDATE loans SET amount_due = amount_due - ? WHERE matatu_id = ?";
      await pool.query(updateLoanQuery, [loanPayment, matatu_id]);
    }

    if (savings > 0) {
      const updateSavingsQuery =
        "UPDATE savings SET amount = amount + ? WHERE matatu_id = ?";
      await pool.query(updateSavingsQuery, [savings, matatu_id]);
    }

    const paymentQuery = `
            INSERT INTO payments (payment_id, user_id, loan, savings, matatu_id, amount_paid, transaction_code, operations, insurance, CheckoutRequestID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    const paymentId = generatePaymentId();
    const userId = req.userId;
    const loanId = loanRows.length > 0 ? loanRows[0].loan_id : null;

    await pool.query(paymentQuery, [
      paymentId,
      userId,
      loanPayment,
      savings,
      matatu_id,
      amount,
      mpesaReceiptNumber,
      operations,
      insurance,
      CheckoutRequestID,
    ]);

    // Update mpesastk table for the successful transaction
    const updateMpesaStkQuery = `
            UPDATE mpesastk SET mpesastk_status = 'successful', ResultCode = ?, ResultDesc = ?, MpesaReceiptNumber = ?
            WHERE mpesastk_id = (SELECT mpesastk_id FROM (SELECT mpesastk_id FROM mpesastk ORDER BY mpesastk_id DESC LIMIT 1) AS sub)
        `;
    await pool.query(updateMpesaStkQuery, [
      ResultCode,
      "Payment successful",
      mpesaReceiptNumber,
    ]);

    res.json({ message: "Payment processed successfully", mpesaReceiptNumber });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const checkPaymentStatus = async (req, res) => {
  const { CheckoutRequestID } = req.query;

  try {
    // Query your database or the MPESA API to check the payment status
    const paymentStatus = await pool.query(
      "SELECT * FROM payments WHERE CheckoutRequestID = ?",
      [CheckoutRequestID]
    );

    if (paymentStatus.length > 0) {
      res.json({
        status: "completed",
        mpesaReceiptNumber: paymentStatus[0].transaction_code,
      });
    } else {
      res.json({ status: "pending" });
    }
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({ error: "Internal server error" });
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
  getTotalSavings,
  latestPayments,
  mpesaCallback,
  checkPaymentStatus,
  shareholderPayment
};
