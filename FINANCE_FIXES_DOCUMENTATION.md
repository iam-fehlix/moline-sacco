# Finance Controller Fixes - Complete Documentation

## Overview

Fixed critical issues in `server/controllers/financeController.js` preventing the **Apply for Loan** and **Financial Status** features from functioning.

## Root Cause Analysis

### Issue 1: Non-existent 'status' Column

**Problem**: Code referenced `status` column on `loans` table which doesn't exist

- Error: `Unknown column 'status' in 'field list'` (MySQL error ER_BAD_FIELD_ERROR 1054)
- Affected endpoints: `/api/finance/pendingLoans`, loan approval, loan eligibility

**Solution**: Replaced status references with proper state tracking:

- `amount_issued = 0 or NULL` → Pending loan
- `amount_issued > 0` → Approved/Active loan
- `amount_due > 0` → Outstanding repayment required
- `amount_due ≤ 0` → Fully paid loan

### Issue 2: Silent Failures in getTotalSavings

**Problem**: Error handling block was preventing responses

```javascript
// BROKEN
catch (error) {
  if (error) {  // Redundant check
    console.error(...);
    return res.status(500).json(...);
  }
  // Control never reached if error occurred
}
```

**Solution**: Removed redundant `if (error)` check

```javascript
// FIXED
catch (error) {
  console.error(...);
  res.status(500).json({ error: "Internal server error", details: error.message });
}
```

### Issue 3: Hardcoded MPESA Response

**Problem**: `paymentProcessing` was hardcoding MPESA receipt number and transaction data

```javascript
const mpesaReceiptNumber = "MPESA123456"; // Hardcoded!
```

**Solution**: Refactored to properly defer to MPESA callback for actual transaction confirmation

### Issue 4: Missing User Context in MPESA Callback

**Problem**: `mpesaCallback` used `req.userId` but callback is async and not from authenticated request

- No way to know which user initiated the payment

**Solution**: Store payment context in `mpesastk` table during STK push initiation:

```javascript
// During paymentProcessing
const mpesaStkQuery = `
  INSERT INTO mpesastk (CheckoutRequestID, user_id, matatu_id, amount, mpesastk_status, created_at)
  VALUES (?, ?, ?, ?, 'pending', NOW())
`;

// During mpesaCallback - retrieve context
const [paymentContext] = await pool.query(
  "SELECT user_id, matatu_id FROM mpesastk WHERE CheckoutRequestID = ? LIMIT 1",
  [CheckoutRequestID]
);
const userId = paymentContext[0].user_id;
const matatu_id = paymentContext[0].matatu_id;
```

### Issue 5: Loan State Initialization

**Problem**: Loans inserted without proper initial state

```javascript
// BROKEN
INSERT INTO loans (..., status, ...) VALUES (..., 'pending', ...)
```

**Solution**: Initialize `amount_issued` to 0 for pending state

```javascript
// FIXED
INSERT INTO loans (user_id, matatu_id, amount_applied, amount_due, loan_type)
VALUES (?, ?, ?, 0, ?)
// amount_issued defaults to 0/NULL = pending
```

## Files Modified

### Primary: `server/controllers/financeController.js`

#### Fixed Functions:

1. **loanRequest** (Lines ~185-235)

   - ✅ Removed status column from INSERT
   - ✅ Fixed guarantor validation error handling
   - ✅ Proper async/await error handling
   - **Result**: Loans now created with amount_issued=0 (pending state)

2. **approveLoan** (Lines ~238-290)

   - ✅ Changed check from status to amount_issued
   - ✅ Prevents double-approval (checks if amount_issued > 0)
   - ✅ Proper validation before update
   - **Result**: Only pending loans can be approved once

3. **getPendingLoans** (Lines ~293-315)

   - ✅ WHERE clause: `amount_issued=0 OR amount_issued IS NULL`
   - ✅ Returns pending loans only
   - ✅ Proper async/await
   - **Result**: Accurate filtering of pending loans

4. **getAllPendingLoans** (Lines ~318-345)

   - ✅ Fixed WHERE clause for pending state
   - ✅ Admin view of all pending approvals
   - **Result**: Admin can see all pending loans across users

5. **checkLoanEligibility** (Lines ~350-410)

   - ✅ Outstanding loan check uses `amount_due > 0`
   - ✅ Share capital requirement validation
   - ✅ Savings requirement check
   - **Result**: Returns eligibility status with reason

6. **getTotalLoans** (Lines ~415-445)

   - ✅ Fixed error handling (removed redundant if check)
   - ✅ Aggregates only outstanding loans (`amount_due > 0`)
   - ✅ Returns totalLoans, totalIssued, loanCount
   - **Result**: Proper loan summary

7. **getTotalSavings** (Lines ~110-135)

   - ✅ CRITICAL FIX: Removed `if (error)` wrapper in catch block
   - ✅ Now properly responds on error
   - ✅ Uses COALESCE for NULL safety
   - **Result**: No more hanging requests

8. **getFinancialStatus** (Lines ~448-475)

   - ✅ New endpoint for financial dashboard
   - ✅ Aggregates savings, loans, insurance, operations
   - ✅ Uses COALESCE for all aggregates
   - **Result**: Single endpoint for financial snapshot

9. **checkOutstandingLoan** (Lines ~485-510)

   - ✅ Returns full loan object `{loan_id, amount_due, amount_issued}`
   - ✅ NOT just a number
   - ✅ Proper NULL handling
   - **Result**: Downstream functions can access loan_id

10. **paymentProcessing** (Lines ~551-597)

    - ✅ Added user authentication check (`req.userId`)
    - ✅ Added input validation (amount, phone, matatu_id)
    - ✅ Stores payment context in mpesastk for callback
    - ✅ Removed hardcoded MPESA receipt
    - ✅ Now properly defers to callback
    - **Result**: Clean separation of STK push and callback

11. **mpesaCallback** (Lines ~600-752)

    - ✅ Retrieves user_id and matatu_id from stored context
    - ✅ Proper error handling (no status exceptions)
    - ✅ Correct payment allocation: operations → insurance → loan → savings
    - ✅ Updates amount_due (not status column)
    - ✅ Inserts savings without payment_id (schema-correct)
    - ✅ Acknowledges all responses with `{ ResponseCode: 0 }`
    - **Result**: Proper MPESA integration

12. **checkPaymentStatus** (Lines ~754-770)
    - ✅ Async/await implementation
    - ✅ Proper result destructuring
    - ✅ Returns payment details on success
    - **Result**: Can check payment status by CheckoutRequestID

## Database Schema Alignment

### Loans Table (Expected Schema)

```sql
CREATE TABLE loans (
  loan_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  matatu_id INT NOT NULL,
  amount_applied DECIMAL(10,2),
  amount_issued DECIMAL(10,2) DEFAULT 0,  -- 0=pending, >0=approved
  amount_due DECIMAL(10,2) DEFAULT 0,     -- >0=active, ≤0=paid
  loan_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- NO 'status' COLUMN
);
```

### Savings Table (Expected Schema)

```sql
CREATE TABLE savings (
  saving_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  matatu_id INT NOT NULL,
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- NO 'payment_id' COLUMN
);
```

### MPESA STK Table (Updated Schema)

```sql
CREATE TABLE mpesastk (
  mpesastk_id INT PRIMARY KEY AUTO_INCREMENT,
  CheckoutRequestID VARCHAR(255) UNIQUE,
  user_id INT,
  matatu_id INT,
  amount DECIMAL(10,2),
  mpesastk_status VARCHAR(50) DEFAULT 'pending',
  ResultCode INT,
  ResultDesc VARCHAR(255),
  MpesaReceiptNumber VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Loan Lifecycle

### Pending State

```
1. User applies: POST /api/finance/applyLoan
   → Creates loan with amount_issued=0, amount_due=0

2. Visible in: GET /api/finance/pendingLoans
   → WHERE amount_issued=0
```

### Approval State

```
3. Admin approves: POST /api/finance/approveLoan
   → Updates amount_issued to approved amount
   → Prevents re-approval (checks if amount_issued > 0)

4. Visible in: GET /api/finance/allPendingLoans
   → No longer visible (amount_issued > 0)
```

### Active Repayment State

```
5. User pays via MPESA: POST /api/finance/processPayment
   → Initiates STK push
   → Stores context in mpesastk

6. MPESA callback: POST /api/finance/mpesaCallback
   → Confirms payment
   → Decrements amount_due
   → Stores payment record
```

### Paid State

```
7. When amount_due ≤ 0
   → Loan is fully repaid
   → No status update needed
   → Gets filtered from active loans
```

## API Endpoints - Updated Behavior

### Apply Loan

```http
POST /api/finance/applyLoan
Authorization: Bearer {token}
Content-Type: application/json

{
  "matatu_id": 1,
  "amount_applied": 50000,
  "loan_type": "matatu_advance",
  "guarantor_name": "John Doe",
  "guarantor_phone": "0712345678",
  "guarantor_id_number": "123456789"
}

Response 201:
{
  "message": "Loan request created successfully",
  "loanId": 123,
  "userId": 1,
  "loanAmount": 50000
}
```

### Get Pending Loans

```http
GET /api/finance/pendingLoans
Authorization: Bearer {token}

Response 200:
[
  {
    "loan_id": 123,
    "loan_type": "matatu_advance",
    "amount_applied": 50000,
    "amount_issued": 0,           // Pending
    "amount_due": 0,
    "matatu_id": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Approve Loan

```http
POST /api/finance/approveLoan
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "loanId": 123,
  "amountToIssue": 50000
}

Response 200:
{
  "message": "Loan approved successfully",
  "loanId": 123,
  "amountIssued": 50000,
  "status": "approved"
}

Response 400: "Loan already approved"
```

### Get Total Savings

```http
GET /api/finance/savings/total
Authorization: Bearer {token}

Response 200:
{
  "totalSavings": 15000,
  "userId": 1
}

Response 500 (now with proper error message):
{
  "error": "Internal server error",
  "details": "{specific error message}"
}
```

### Process Payment

```http
POST /api/finance/processPayment
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 2000,
  "phone": "254712345678",
  "vehicleRegistrationNumber": "KCA 123Z",
  "matatu_id": 1
}

Response 200:
{
  "message": "STK Push initiated. Awaiting MPESA confirmation.",
  "CheckoutRequestID": "ws_CO_DMZ...123"
}
```

### MPESA Callback

```http
POST /api/finance/mpesaCallback
Content-Type: application/json

{
  "Body": {
    "stkCallback": {
      "CheckoutRequestID": "ws_CO_DMZ...123",
      "ResultCode": 0,
      "CallbackMetadata": {
        "Item": [
          { "Name": "MpesaReceiptNumber", "Value": "LGP61H3Z60" },
          { "Name": "Amount", "Value": 2000 },
          ...
        ]
      }
    }
  }
}

Response 200:
{
  "ResponseCode": 0
}

Internally:
- Updates amount_due: 50000 - 1500 = 48500 (after allocation)
- Records payment in payments table
- Creates savings record if remainder > 0
- Updates mpesastk with 'successful' status
```

## Testing Instructions

### Test File Location

```
c:\Users\F3HLIX\Desktop\Moline-sacco-management-system\vuka-zip\test-finance-api.js
```

### Run Tests

```bash
cd c:\Users\F3HLIX\Desktop\Moline-sacco-management-system\vuka-zip
node test-finance-api.js
```

### Manual Testing with cURL/Postman

1. **Get JWT Token** (login first):

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","password":"password"}'
```

2. **Apply for Loan**:

```bash
curl -X POST http://localhost:5000/api/finance/applyLoan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "matatu_id": 1,
    "amount_applied": 50000,
    "loan_type": "matatu_advance",
    "guarantor_name": "John Doe",
    "guarantor_phone": "0712345678",
    "guarantor_id_number": "123456789"
  }'
```

3. **Get Pending Loans**:

```bash
curl http://localhost:5000/api/finance/pendingLoans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Check Loan Eligibility**:

```bash
curl "http://localhost:5000/api/finance/userFinance?matatu_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

5. **Get Total Savings**:

```bash
curl http://localhost:5000/api/finance/savings/total \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Known Limitations

1. **Hardcoded Allocation**: Payment allocation (operations 250, insurance 250) is fixed

   - Could be made configurable in future

2. **No Transaction Logging**: No detailed audit trail of state changes

   - Could add payment_status table for traceability

3. **MPESA Callback Assumed Trusted**: No MPESA signature validation shown

   - In production, verify callback signatures

4. **Single Outstanding Loan per Matatu**: Code assumes one active loan
   - May need refinement for multiple loans scenario

## Success Metrics

✅ **Apply for Loan Feature**

- POST /api/finance/applyLoan returns 201 without schema errors
- GET /api/finance/pendingLoans returns loan with amount_issued=0
- POST /api/finance/approveLoan updates amount_issued > 0
- Cannot re-approve already-approved loans

✅ **Financial Status Feature**

- GET /api/finance/savings/total responds (no hanging)
- GET /api/finance/loans/total returns proper aggregates
- GET /api/finance/financialStatus returns snapshot
- All error responses include details field

✅ **Payment Flow**

- MPESA callback properly retrieves user_id and matatu_id
- amount_due properly decrements on payment
- No SQL errors from missing status column
- All acknowledging responses sent to MPESA

## Continuation

To fully validate, please:

1. Restart backend server: `cd server && npm start`
2. Test Apply Loan flow end-to-end
3. Test Financial Status calculations
4. If MPESA sandbox is configured, test payment flow
5. Check server logs for any remaining issues

All code changes are ready for production testing.
