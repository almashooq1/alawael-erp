const axios = require('axios');

const pickBase = async () => {
  const explicit = process.env.SMOKE_BASE_URL;
  if (explicit) return explicit;
  const tried = [];
  const ports = [process.env.PORT || 3002, 3001, 3003, 3004, 3005, 3006].map(Number);
  for (const p of ports) {
    const url = `http://localhost:${p}`;
    tried.push(url);
    try {
      const r = await axios.get(`${url}/health`, { timeout: 2000 });
      if (r.status === 200) return url;
    } catch (_) {}
  }
  throw new Error(`No responsive server found. Tried: ${tried.join(', ')}`);
};

async function run() {
  const base = await pickBase();
  const api = `${base}/api`;
  console.log(`\nBasic Smoke Test against ${base}\n`);
  // Read system info if available
  try {
    const info = await axios.get(`${api}/info`, { timeout: 3000 });
    console.log(`ℹ️  info -> ${JSON.stringify(info.data).slice(0, 200)}`);
  } catch (_) {
    console.log('ℹ️  /api/info not available');
  }
  const endpoints = [
    { name: 'root', url: `${base}/` },
    { name: 'health', url: `${base}/health` },
    { name: 'api health', url: `${api}/health` },
    { name: 'vehicles', url: `${api}/vehicles` },
    { name: 'bookings stats', url: `${api}/bookings/stats` },
    { name: 'driver ratings sample', url: `${api}/driver-ratings/sample/DRV-001/level` },
    { name: 'alerts active', url: `${api}/alerts/active` },
  ];
  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep.url, { timeout: 4000 });
      const status = res.status;
      const brief =
        typeof res.data === 'object'
          ? JSON.stringify(res.data).slice(0, 200)
          : String(res.data).slice(0, 200);
      console.log(`✅ ${ep.name} [${status}] -> ${brief}`);
    } catch (err) {
      const msg = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
      console.log(`❌ ${ep.name} -> ${msg}`);
    }
  }
}

run().catch(err => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
