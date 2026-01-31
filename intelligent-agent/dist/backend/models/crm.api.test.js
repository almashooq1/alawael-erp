"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
(0, vitest_1.describe)('CRM API', () => {
    let customerId = '';
    (0, vitest_1.it)('should create a customer', async () => {
        try {
            const randomEmail = `test_${Math.random().toString(36).substring(2, 10)}@example.com`;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/customers')
                .send({ name: 'Test User', email: randomEmail, phone: '123456', company: 'TestCo' });
            if (res.status !== 201) {
                console.error('Create customer response:', res.status, res.body);
            }
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.name).toBe('Test User');
            customerId = res.body._id;
        }
        catch (err) {
            console.error('Create customer error:', err);
            throw err;
        }
    }, 20000);
    (0, vitest_1.it)('should get all customers', async () => {
        try {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/customers');
            if (res.status !== 200) {
                console.error('Get all customers response:', res.status, res.body);
            }
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        }
        catch (err) {
            console.error('Get all customers error:', err);
            throw err;
        }
    }, 20000);
    (0, vitest_1.it)('should update a customer', async () => {
        try {
            const res = await (0, supertest_1.default)(app_1.default)
                .put(`/api/customers/${customerId}`)
                .send({ name: 'Updated User' });
            if (res.status !== 200) {
                console.error('Update customer response:', res.status, res.body);
            }
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.name).toBe('Updated User');
        }
        catch (err) {
            console.error('Update customer error:', err);
            throw err;
        }
    }, 20000);
    (0, vitest_1.it)('should delete a customer', async () => {
        try {
            const res = await (0, supertest_1.default)(app_1.default).delete(`/api/customers/${customerId}`);
            if (res.status !== 200) {
                console.error('Delete customer response:', res.status, res.body);
            }
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.message).toBe('Customer deleted');
        }
        catch (err) {
            console.error('Delete customer error:', err);
            throw err;
        }
    }, 20000);
});
