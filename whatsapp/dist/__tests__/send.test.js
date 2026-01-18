"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const send_1 = require("../send");
const persistence_1 = require("../persistence");
const rateLimit_1 = require("../rateLimit");
const node_fetch_1 = __importDefault(require("node-fetch"));
jest.mock('node-fetch');
jest.mock('../persistence');
jest.mock('../rateLimit');
const mockFetch = node_fetch_1.default;
describe('send', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.WHATSAPP_TOKEN = 'test-token';
        process.env.PHONE_NUMBER_ID = '123456';
    });
    it('should enforce rate limit before sending', async () => {
        rateLimit_1.enforceRateLimit.mockResolvedValue(undefined);
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ messages: [{ id: 'wamsg123' }] }),
        });
        persistence_1.persistOutboundMessage.mockResolvedValue({ id: 'msg123' });
        await (0, send_1.sendAndPersist)({ to: '1234567890', body: 'test' });
        expect(rateLimit_1.enforceRateLimit).toHaveBeenCalledWith('1234567890');
    });
    it('should persist message after sending', async () => {
        rateLimit_1.enforceRateLimit.mockResolvedValue(undefined);
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ messages: [{ id: 'wamsg123' }] }),
        });
        persistence_1.persistOutboundMessage.mockResolvedValue({ id: 'msg123' });
        await (0, send_1.sendAndPersist)({ to: '1234567890', body: 'test' });
        expect(persistence_1.persistOutboundMessage).toHaveBeenCalledWith(expect.objectContaining({ to: '1234567890', waMessageId: 'wamsg123' }));
    });
});
