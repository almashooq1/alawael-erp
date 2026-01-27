"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToDropbox = uploadToDropbox;
const dropbox_1 = require("dropbox");
const fs_1 = __importDefault(require("fs"));
async function uploadToDropbox({ accessToken, filePath, dropboxPath }) {
    const dbx = new dropbox_1.Dropbox({ accessToken, fetch });
    const fileContent = fs_1.default.readFileSync(filePath);
    const res = await dbx.filesUpload({ path: dropboxPath, contents: fileContent });
    return res.result.id;
}
