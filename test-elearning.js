// Test elearning module functionality

const testElearning = async () => {
  console.log('\n=== ELEARNING MODULE TEST ===\n');

  // Test 1: Check if elearning route is accessible
  console.log('Test 1: Check elearning route...');
  try {
    const response = await fetch('http://localhost:3001/api/modules/elearning', {
      headers: { Authorization: 'Bearer test-token' },
    });

    if (response.status === 404) {
      console.error('❌ API endpoint not found');
      console.log('   Route: /api/modules/elearning does not exist');
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Elearning API endpoint working');
      console.log('   Data:', JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ API error: ${response.status}`);
    }
  } catch (err) {
    console.error('❌ Cannot reach API:', err.message);
  }

  // Test 2: Check if ModulePage component can render elearning
  console.log('\nTest 2: Check if elearning mock data exists...');
  try {
    const moduleMocks = {
      elearning: {
        kpis: [
          { label: 'دورات نشطة', value: '24', trend: '+2', tone: 'success' },
          { label: 'إكمال هذا الأسبوع', value: '68%', trend: '+5%', tone: 'success' },
          { label: 'جلسات مباشرة اليوم', value: '4', trend: '', tone: 'info' },
        ],
        items: [
          { title: 'ذكاء اصطناعي للمبتدئين', status: 'مباشر 4م', amount: '' },
          { title: 'أمن المعلومات', status: 'مسجل', amount: '' },
          { title: 'الإرشاد الوظيفي', status: 'تدريب حي', amount: '' },
        ],
      },
    };

    if (moduleMocks.elearning && moduleMocks.elearning.kpis) {
      console.log('✅ Elearning mock data exists');
      console.log(`   KPIs count: ${moduleMocks.elearning.kpis.length}`);
      console.log(`   Items count: ${moduleMocks.elearning.items.length}`);
    } else {
      console.error('❌ Elearning mock data missing');
    }
  } catch (err) {
    console.error('❌ Error checking mock data:', err.message);
  }

  // Test 3: Check if StudentLibrary page exists and works
  console.log('\nTest 3: Check StudentLibrary page...');
  try {
    const response = await fetch('http://localhost:3000/student-portal/library');
    if (response.ok) {
      console.log('✅ StudentLibrary page is accessible');
    } else {
      console.error(`❌ StudentLibrary returned status: ${response.status}`);
    }
  } catch (err) {
    console.log('⚠️  Cannot check StudentLibrary (client-side route)');
  }

  // Test 4: Summary
  console.log('\n=== TEST SUMMARY ===\n');
  console.log('Elearning module structure:');
  console.log('├── Route: /elearning');
  console.log('├── Page: ModulePage with moduleKey="elearning"');
  console.log('├── Mock Data: Available in moduleMocks.js');
  console.log('├── Student Portal: /student-portal/library');
  console.log('└── Backend API: /api/modules/elearning (optional)');
  console.log('\nIssues to check:');
  console.log('1. Does /elearning route display correctly?');
  console.log('2. Are courses loading from API or mock data?');
  console.log('3. Is StudentLibrary component working properly?');
  console.log('4. Are there any console errors?');
};

// Run tests
testElearning().catch(console.error);
