"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressionMiddleware = void 0;
const compression_1 = __importDefault(require("compression"));
/**
 * Middleware لضغط الـ responses
 * يقلل حجم البيانات المنقولة بنسبة 70-90%
 */
exports.compressionMiddleware = (0, compression_1.default)({
    // ضغط جميع الـ responses
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    // مستوى الضغط (0-9)
    level: 6, // توازن بين السرعة وحجم الضغط
    // الحد الأدنى لحجم الـ response للضغط
    threshold: 1024, // 1KB
    // Memory level (1-9)
    memLevel: 8,
    // استراتيجية الضغط (Z_DEFAULT_STRATEGY = 0)
    strategy: 0,
});
exports.default = exports.compressionMiddleware;
