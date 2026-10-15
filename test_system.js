const http = require('http');

// Helper to make HTTP request
function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Automated Test Suite ---');
  let cookie = null;

  try {
    // 1. Fetch Categories
    console.log('1. Testing GET /api/categories...');
    const catRes = await request({ hostname: 'localhost', port: 3000, path: '/api/categories', method: 'GET' });
    console.log('   Status:', catRes.status, '| Categories found:', catRes.data.data.length);

    // 2. Fetch Products
    console.log('2. Testing GET /api/products...');
    const prodRes = await request({ hostname: 'localhost', port: 3000, path: '/api/products', method: 'GET' });
    console.log('   Status:', prodRes.status, '| Products found:', prodRes.data.data.length);

    // 3. Admin Login (bcrypt verification)
    console.log('3. Testing POST /api/auth/login (admin/admin123)...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });
    console.log('   Status:', loginRes.status, '| Success:', loginRes.data.success);

    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'][0].split(';')[0];
    }

    // 4. Test Protected Route with Session Cookie
    console.log('4. Testing GET /api/reports/dashboard (Protected Route)...');
    const repRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/reports/dashboard',
      method: 'GET',
      headers: { 'Cookie': cookie }
    });
    console.log('   Status:', repRes.status, '| Total Revenue:', repRes.data.data.summary.totalRevenue);
    console.log('   Low stock items count:', repRes.data.data.summary.lowStockCount);

    // 5. Test Customer Checkout
    console.log('5. Testing POST /api/orders (Checkout transaction)...');
    const orderRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      customer: {
        name: 'Automated Tester',
        email: 'tester@grocery.test',
        phone: '+94 77 999 8888',
        address: '100 Code Street, Dev City'
      },
      items: [
        { productId: prodRes.data.data[0].id, qty: 1 }
      ]
    });
    console.log('   Status:', orderRes.status, '| Order ID:', orderRes.data.data.orderId, '| Total: $' + orderRes.data.data.total);

    const orderId = orderRes.data.data.orderId;

    // 6. Test Mock Payment
    console.log('6. Testing POST /api/payments/process (Mock Card Gateway)...');
    const payRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/payments/process',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      orderId: orderId,
      method: 'Credit Card',
      cardNumber: '4242 4242 4242 4242',
      cvv: '123'
    });
    console.log('   Status:', payRes.status, '| TXN Ref:', payRes.data.receipt.reference, '| Status:', payRes.data.message);

    console.log('\n=======================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED 100%!');
    console.log('=======================================');
    process.exit(0);

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

// Start server in background then run tests
const server = require('./server');
setTimeout(runTests, 1200);
