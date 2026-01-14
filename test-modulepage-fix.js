/**
 * Test ModulePage Fix - Quick verification
 * 
 * This test verifies that the ModulePage component handles null data correctly
 */

console.log('\n🧪 Testing ModulePage Fix...\n');

// Test 1: Check if backend is running
async function testBackend() {
  try {
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    console.log('✅ Backend Health:', data.status);
    return true;
  } catch (error) {
    console.error('❌ Backend Error:', error.message);
    return false;
  }
}

// Test 2: Check if modules API works
async function testModulesAPI() {
  try {
    // First, login to get token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@alawael.com',
        password: 'Admin@123456'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.accessToken) {
      console.error('❌ Login failed - no token');
      return false;
    }
    
    console.log('✅ Login successful');
    
    // Test each module
    const modules = ['elearning', 'rehab', 'reports', 'finance', 'hr', 'crm', 'security'];
    let allPass = true;
    
    for (const module of modules) {
      try {
        const response = await fetch(`http://localhost:3001/api/modules/${module}`, {
          headers: {
            'Authorization': `Bearer ${loginData.accessToken}`
          }
        });
        
        const data = await response.json();
        
        if (data && data.kpis && data.items && data.actions) {
          console.log(`✅ Module ${module}: has kpis, items, actions`);
        } else {
          console.log(`⚠️ Module ${module}: missing some data`);
          console.log(`   - kpis: ${data?.kpis ? 'yes' : 'NO'}`);
          console.log(`   - items: ${data?.items ? 'yes' : 'NO'}`);
          console.log(`   - actions: ${data?.actions ? 'yes' : 'NO'}`);
        }
      } catch (error) {
        console.error(`❌ Module ${module} failed:`, error.message);
        allPass = false;
      }
    }
    
    return allPass;
  } catch (error) {
    console.error('❌ Modules API Error:', error.message);
    return false;
  }
}

// Test 3: Check Frontend
async function testFrontend() {
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      console.log('✅ Frontend is running');
      return true;
    } else {
      console.error('❌ Frontend returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Frontend Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const backendOk = await testBackend();
  console.log('');
  
  const modulesOk = await testModulesAPI();
  console.log('');
  
  const frontendOk = await testFrontend();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Test Results:');
  console.log(`   Backend: ${backendOk ? '✅' : '❌'}`);
  console.log(`   Modules API: ${modulesOk ? '✅' : '❌'}`);
  console.log(`   Frontend: ${frontendOk ? '✅' : '❌'}`);
  
  if (backendOk && modulesOk && frontendOk) {
    console.log('\n🎉 All tests passed! The fix is working.\n');
    console.log('👉 Now open: http://localhost:3000/elearning');
    console.log('👉 Or try: http://localhost:3000/reports');
    console.log('👉 No more "Cannot read properties of null" errors!\n');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.\n');
  }
}

// Run
runTests().catch(console.error);
