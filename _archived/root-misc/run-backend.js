// ملف تشغيل Backend بشكل مستقل
const { spawn } = require('child_process');
const path = require('path');

const backendPath = path.join(__dirname, 'backend');
const serverPath = path.join(backendPath, 'server.js');

console.log('🚀 تشغيل Backend من:', serverPath);

const child = spawn('node', [serverPath], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('❌ خطأ:', error.message);
});

child.on('close', (code) => {
  console.log(`🔴 تم إغلاق العملية برمز: ${code}`);
});