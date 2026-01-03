/**
 * Test script for Finance API endpoints
 * Tests: Apply Loan, Pending Loans, Approve Loan, Get Loan Eligibility
 */

const http = require('http');
const BASE_URL = 'http://localhost:5000';

// Mock JWT token (you need a real token from login)
const MOCK_TOKEN = 'your-jwt-token-here';
const TEST_USER_ID = 1;
const TEST_MATATU_ID = 1;

function makeRequest(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, body: response });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Finance API Test Suite\n');
  console.log('⚠️  IMPORTANT: Make sure your backend server is running on port 5000');
  console.log('⚠️  IMPORTANT: Get a real JWT token from login and replace MOCK_TOKEN\n');

  try {
    // Test 1: Check Loan Eligibility
    console.log('📋 Test 1: Check Loan Eligibility');
    console.log('Endpoint: GET /api/finance/userFinance?matatu_id=' + TEST_MATATU_ID);
    const eligibility = await makeRequest('GET', `/api/finance/userFinance?matatu_id=${TEST_MATATU_ID}`, null, MOCK_TOKEN);
    console.log('Response:', eligibility.status, eligibility.body);
    console.log('✓ Expected: 401 (missing valid token) or 200 with eligibility data\n');

    // Test 2: Apply for Loan
    console.log('📋 Test 2: Apply for Loan');
    console.log('Endpoint: POST /api/finance/applyLoan');
    const loanApplication = {
      matatu_id: TEST_MATATU_ID,
      amount_applied: 50000,
      loan_type: 'matatu_advance',
      guarantor_name: 'John Doe',
      guarantor_phone: '0712345678',
      guarantor_id_number: '123456789'
    };
    console.log('Request Body:', loanApplication);
    const applyLoan = await makeRequest('POST', '/api/finance/applyLoan', loanApplication, MOCK_TOKEN);
    console.log('Response:', applyLoan.status, applyLoan.body);
    console.log('✓ Expected: 201 with loan_id or 400/401 errors\n');

    // Test 3: Get Pending Loans
    console.log('📋 Test 3: Get User Pending Loans');
    console.log('Endpoint: GET /api/finance/pendingLoans');
    const pendingLoans = await makeRequest('GET', '/api/finance/pendingLoans', null, MOCK_TOKEN);
    console.log('Response:', pendingLoans.status, pendingLoans.body);
    console.log('✓ Expected: 200 with array of loans where amount_issued=0 or NULL\n');

    // Test 4: Get Total Loans
    console.log('📋 Test 4: Get Total Loans');
    console.log('Endpoint: GET /api/finance/loans/total');
    const totalLoans = await makeRequest('GET', '/api/finance/loans/total', null, MOCK_TOKEN);
    console.log('Response:', totalLoans.status, totalLoans.body);
    console.log('✓ Expected: 200 with { totalLoans, totalIssued, loanCount }\n');

    // Test 5: Get Total Savings
    console.log('📋 Test 5: Get Total Savings');
    console.log('Endpoint: GET /api/finance/savings/total');
    const totalSavings = await makeRequest('GET', '/api/finance/savings/total', null, MOCK_TOKEN);
    console.log('Response:', totalSavings.status, totalSavings.body);
    console.log('✓ Expected: 200 with { totalSavings, userId }\n');

    // Test 6: Approve Loan (admin only)
    console.log('📋 Test 6: Approve Loan (Admin)');
    console.log('Endpoint: POST /api/finance/approveLoan');
    console.log('⚠️  Requires admin token and valid loan_id from Test 2\n');

    // Test 7: Financial Status
    console.log('📋 Test 7: Get Financial Status');
    console.log('Endpoint: GET /api/finance/financialStatus?matatu_id=' + TEST_MATATU_ID);
    const financialStatus = await makeRequest('GET', `/api/finance/financialStatus?matatu_id=${TEST_MATATU_ID}`, null, MOCK_TOKEN);
    console.log('Response:', financialStatus.status, financialStatus.body);
    console.log('✓ Expected: 200 with aggregated financial snapshot\n');

    console.log('✅ Test suite completed. Check responses above for correctness.');
  } catch (error) {
    console.error('❌ Error running tests:', error.message);
    console.error('Make sure the backend server is running on http://localhost:5000');
  }
}

runTests();
