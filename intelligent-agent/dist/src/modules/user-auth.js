"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.authenticate = authenticate;
exports.getUserById = getUserById;
exports.listUsers = listUsers;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const users = [];
function createUser(username, password, role = 'user') {
    const passwordHash = bcryptjs_1.default.hashSync(password, 10);
    const user = {
        id: Math.random().toString(36).slice(2),
        username,
        passwordHash,
        role,
        createdAt: new Date().toISOString()
    };
    users.push(user);
    return user;
}
function authenticate(username, password) {
    const user = users.find(u => u.username === username);
    if (!user)
        return null;
    if (!bcryptjs_1.default.compareSync(password, user.passwordHash))
        return null;
    return user;
}
function getUserById(id) {
    return users.find(u => u.id === id);
}
function listUsers() {
    return users;
}
