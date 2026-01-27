"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
class ReportGenerator {
    constructor(fileManager) {
        this.fileManager = fileManager;
    }
    async generateReport(data, path) {
        const content = JSON.stringify(data, null, 2);
        await this.fileManager.write(path, content);
        return path;
    }
}
exports.ReportGenerator = ReportGenerator;
