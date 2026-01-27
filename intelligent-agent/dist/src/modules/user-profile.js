"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileManager = void 0;
class UserProfileManager {
    constructor() {
        this.users = new Map();
    }
    addUser(user) {
        this.users.set(user.id, user);
    }
    getUser(id) {
        return this.users.get(id);
    }
    listUsers() {
        return Array.from(this.users.values());
    }
}
exports.UserProfileManager = UserProfileManager;
