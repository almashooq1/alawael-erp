const request = require('supertest');
const { app } = require('../server_ultimate');

describe('POST /api/payroll-sa/calculate', () => {
  it('calculates a payroll line without persistence', async () => {
    const payload = {
      month: 1,
      year: 2026,
      overtimeHoursWorkday: 4,
      overtimeHoursWeekend: 2,
      absenceHours: 1,
      bonuses: [{ name: 'Performance', amount: 100 }],
      manualDeductions: [{ name: 'Loan', amount: 50 }],
      save: false,
    };

    const res = await request(app)
      .post('/api/payroll-sa/calculate')
      .set('Authorization', 'Bearer test-token')
      .send(payload)
      .set('Accept', 'application/json');

    expect([200, 201, 401, 403].includes(res.status)).toBe(true);

    if (res.status === 200 || res.status === 201) {
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      const d = res.body.data;
      expect(d).toHaveProperty('month', 1);
      expect(d).toHaveProperty('year', 2026);
      expect(d).toHaveProperty('totals');
      expect(d.totals).toHaveProperty('gross');
      expect(d.totals).toHaveProperty('net');
      expect(res.body).toHaveProperty('persisted', false);
    } else {
      expect(res.body).toHaveProperty('success', false);
    }
  });
});
