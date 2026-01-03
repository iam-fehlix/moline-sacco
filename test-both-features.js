/**
 * Comprehensive test for Apply Loan and Financial Status features
 * Run: node test-both-features.js
 */

const http = require('http');
const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  userId: 1,
  matatuId: 1,
  loanAmount: 50000,
  loanType: 'emergency',
};

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testApplyForLoan(token) {
  console.log('\n=== FEATURE 1: APPLY FOR LOAN ===\n');
  
  try {
    // Test 1: Apply for loan
    console.log('1️⃣ Test: POST /finance/applyLoan');
    console.log('📝 Request body:', {
      matatuId: TEST_CONFIG.matatuId,
      loanAmount: TEST_CONFIG.loanAmount,
      loanType: TEST_CONFIG.loanType,
    });
    
    const applyResponse = await request('POST', '/finance/applyLoan', {
      matatuId: TEST_CONFIG.matatuId,
      loanAmount: TEST_CONFIG.loanAmount,
      loanType: TEST_CONFIG.loanType,
    }, token);
    
    console.log(`📊 Response [${applyResponse.status}]:`, applyResponse.body);
    
    if (applyResponse.status !== 201) {
      console.log('❌ FAILED: Expected 201, got', applyResponse.status);
      return false;
    }
    
    const loanId = applyResponse.body.loanId;
    console.log('✅ Loan created with ID:', loanId);
    
    // Test 2: Get pending loans
    console.log('\n2️⃣ Test: GET /finance/pendingLoans');
    const pendingResponse = await request('GET', '/finance/pendingLoans', null, token);
    console.log(`📊 Response [${pendingResponse.status}]:`, pendingResponse.body);
    
    if (pendingResponse.status !== 200) {
      console.log('❌ FAILED: Expected 200, got', pendingResponse.status);
      return false;
    }
    
    const hasPendingLoan = Array.isArray(pendingResponse.body) && 
                          pendingResponse.body.some(l => l.loan_id === loanId);
    
    if (!hasPendingLoan) {
      console.log('❌ FAILED: Loan not found in pending loans');
      return false;
    }
    console.log('✅ Loan appears in pending loans list');
    
    // Test 3: Check loan eligibility
    console.log('\n3️⃣ Test: GET /finance/userFinance?matatu_id=' + TEST_CONFIG.matatuId);
    const eligibilityResponse = await request(
      'GET', 
      `/finance/userFinance?matatu_id=${TEST_CONFIG.matatuId}`, 
      null, 
      token
    );
    console.log(`📊 Response [${eligibilityResponse.status}]:`, eligibilityResponse.body);
    
    if (eligibilityResponse.status === 200) {
      console.log('✅ Loan eligibility check passed');
    }
    
    return { success: true, loanId };
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

async function testFinancialStatus(token) {
  console.log('\n=== FEATURE 2: FINANCIAL STATUS ===\n');
  
  try {
    // Test 1: Get total savings
    console.log('1️⃣ Test: GET /finance/savings/total');
    const savingsResponse = await request('GET', '/finance/savings/total', null, token);
    console.log(`📊 Response [${savingsResponse.status}]:`, savingsResponse.body);
    
    if (savingsResponse.status !== 200) {
      console.log('❌ FAILED: Expected 200, got', savingsResponse.status);
      return false;
    }
    
    if (typeof savingsResponse.body.totalSavings !== 'number') {
      console.log('❌ FAILED: totalSavings is not a number');
      return false;
    }
    console.log('✅ Total savings retrieved:', savingsResponse.body.totalSavings);
    
    // Test 2: Get total loans
    console.log('\n2️⃣ Test: GET /finance/loans/total');
    const loansResponse = await request('GET', '/finance/loans/total', null, token);
    console.log(`📊 Response [${loansResponse.status}]:`, loansResponse.body);
    
    if (loansResponse.status !== 200) {
      console.log('❌ FAILED: Expected 200, got', loansResponse.status);
      return false;
    }
    
    if (typeof loansResponse.body.totalLoans !== 'number') {
      console.log('❌ FAILED: totalLoans is not a number');
      return false;
    }
    console.log('✅ Total loans retrieved:', loansResponse.body.totalLoans);
    
    // Test 3: Get financial status
    console.log('\n3️⃣ Test: GET /finance/financialStatus?matatu_id=' + TEST_CONFIG.matatuId);
    const statusResponse = await request(
      'GET',
      `/finance/financialStatus?matatu_id=${TEST_CONFIG.matatuId}`,
      null,
      token
    );
    console.log(`📊 Response [${statusResponse.status}]:`, statusResponse.body);
    
    if (statusResponse.status !== 200) {
      console.log('❌ FAILED: Expected 200, got', statusResponse.status);
      return false;
    }
    
    if (!statusResponse.body.totalSavings || !statusResponse.body.totalOutstanding) {
      console.log('❌ FAILED: Missing required fields in response');
      return false;
    }
    console.log('✅ Financial status retrieved');
    
    return true;
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 FINANCE FEATURES TEST SUITE\n');
  console.log('⚠️  REQUIREMENTS:');
  console.log('   1. Backend server running on http://localhost:5000');
  console.log('   2. Valid JWT token for authentication');
  console.log('   3. Database with required schema\n');
  
  // For testing without real token, we'll attempt with null
  const token = process.env.JWT_TOKEN || null;
  
  if (!token) {
    console.log('⚠️  WARNING: No JWT token provided. Testing endpoints that require authentication may fail.');
    console.log('   Set JWT_TOKEN environment variable to test authenticated endpoints.');
    console.log('   Example: set JWT_TOKEN=your_token_here\n');
  }
  
  try {
    // Test Apply for Loan feature
    const loanResult = await testApplyForLoan(token);
    
    // Test Financial Status feature
    const statusResult = await testFinancialStatus(token);
    
    // Summary
    console.log('\n\n=== TEST SUMMARY ===');
    console.log(`Apply for Loan: ${loanResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Financial Status: ${statusResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (loanResult && statusResult) {
      console.log('\n🎉 All tests PASSED! Both features are working correctly.\n');
    } else {
      console.log('\n⚠️  Some tests failed. Check the output above for details.\n');
    }
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error('Make sure your backend server is running on port 5000\n');
  }
}

// Run tests
runTests();
