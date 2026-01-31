"use strict";
// process.integration.test.ts
// اختبار تكامل API العمليات
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const process_integration_1 = __importDefault(require("./process.integration"));
describe('Process API Integration', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(process_integration_1.default);
    it('should add and fetch a process', async () => {
        const res1 = await (0, supertest_1.default)(app)
            .post('/processes')
            .send({ name: 'Test Process', status: 'active', steps: [], createdAt: '', updatedAt: '' });
        expect(res1.status).toBe(201);
        expect(res1.body.name).toBe('Test Process');
        const res2 = await (0, supertest_1.default)(app).get('/processes');
        expect(res2.body.length).toBeGreaterThan(0);
        expect(res2.body[0].name).toBe('Test Process');
    });
    it('should update a process', async () => {
        const res1 = await (0, supertest_1.default)(app)
            .post('/processes')
            .send({ name: 'To Update', status: 'active', steps: [], createdAt: '', updatedAt: '' });
        const id = res1.body._id;
        const res2 = await (0, supertest_1.default)(app)
            .put(`/processes/${id}`)
            .send({ name: 'Updated Name' });
        expect(res2.body.name).toBe('Updated Name');
    });
    it('should delete a process', async () => {
        const res1 = await (0, supertest_1.default)(app)
            .post('/processes')
            .send({ name: 'To Delete', status: 'active', steps: [], createdAt: '', updatedAt: '' });
        const id = res1.body._id;
        const res2 = await (0, supertest_1.default)(app).delete(`/processes/${id}`);
        expect(res2.status).toBe(204);
        const res3 = await (0, supertest_1.default)(app).get('/processes');
        expect(res3.body.find((p) => p._id === id)).toBeUndefined();
    });
});
