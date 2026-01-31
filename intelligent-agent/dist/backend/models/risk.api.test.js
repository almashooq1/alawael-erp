"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const mongoose_1 = __importDefault(require("mongoose"));
describe('Risk Management API', () => {
    let createdId;
    afterAll(async () => {
        await mongoose_1.default.connection.close();
    });
    it('should create a new risk', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/risks')
            .send({
            title: 'اختبار المخاطر',
            description: 'وصف تجريبي',
            category: 'تشغيلي',
            likelihood: 4,
            impact: 5,
            owner: 'admin',
            status: 'open',
        });
        expect(res.status).toBe(201);
        expect(res.body.title).toBe('اختبار المخاطر');
        createdId = res.body._id;
    });
    it('should get all risks', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/risks');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
    it('should update a risk', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .put(`/api/risks/${createdId}`)
            .send({ status: 'closed' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('closed');
    });
    it('should delete a risk', async () => {
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/risks/${createdId}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
