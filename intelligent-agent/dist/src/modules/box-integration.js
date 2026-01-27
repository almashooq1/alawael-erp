"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToBox = uploadToBox;
const BoxSDK = require('box-node-sdk');
const fs_1 = __importDefault(require("fs"));
async function uploadToBox({ clientId, clientSecret, accessToken, filePath, boxFolderId, name }) {
    const sdk = new BoxSDK();
    const client = sdk.getBasicClient(accessToken);
    const stream = fs_1.default.createReadStream(filePath);
    const res = await client.files.uploadFile(boxFolderId, name, stream);
    return res.entries[0].id;
}
