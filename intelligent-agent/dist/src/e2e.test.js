"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// اختبار End-to-End لمسار NLP
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("./server");
describe('E2E: NLP API', () => {
    it('should return NLP result for valid request', async () => {
        const res = await (0, supertest_1.default)(server_1.app)
            .post('/v1/nlp')
            .set('x-tenant-id', 'tenant1')
            .set('Authorization', 'Bearer testtoken')
            .send({ text: 'هذا نص للاختبار', userId: '1', roles: ['admin'] });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('sentiment');
    });
});
