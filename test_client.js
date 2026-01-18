const http = require('http');
http
  .get('http://127.0.0.1:3010/api/documents-smart/templates', res => {
    console.log('Status:', res.statusCode);
  })
  .on('error', e => {
    console.error('Error:', e.message);
  });
