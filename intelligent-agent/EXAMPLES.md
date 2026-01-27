# أمثلة استخدام النظام الذكي

## تحليل نص عبر REST

```bash
curl -X POST http://localhost:3000/v1/nlp \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: tenant1' \
  -H 'Authorization: Bearer testtoken' \
  -d '{"text": "هذا نص للاختبار","userId": "1","roles": ["admin"]}'
```

## تحليل نص عبر CLI

```bash
npm run build
node dist/cli.js nlp "هذا نص للاختبار"
```

## تحليل نص عبر WebSocket

```js
const socket = io('ws://localhost:4000');
socket.emit('nlp', { text: 'مرحبا' });
socket.on('nlp-result', result => console.log(result));
```
