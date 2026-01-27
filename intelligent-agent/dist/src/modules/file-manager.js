"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManager = void 0;
// وحدة إدارة الملفات (File Manager)
const fs_1 = require("fs");
class FileManager {
    async read(path) {
        return fs_1.promises.readFile(path, 'utf-8');
    }
    async write(path, data) {
        await fs_1.promises.writeFile(path, data, 'utf-8');
    }
    async exists(path) {
        try {
            await fs_1.promises.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.FileManager = FileManager;
