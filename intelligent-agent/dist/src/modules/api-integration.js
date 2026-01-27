"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIIntegration = void 0;
// وحدة تكامل مع API خارجي
const axios_1 = __importDefault(require("axios"));
class APIIntegration {
    async fetchData(endpoint) {
        try {
            const response = await axios_1.default.get(endpoint);
            return response.data;
        }
        catch (error) {
            console.error('API fetch error:', error);
            return null;
        }
    }
}
exports.APIIntegration = APIIntegration;
