"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBAC = void 0;
class RBAC {
    constructor() {
        this.delegations = [];
        this.groups = [];
        this.acls = [];
    }
    // Delegation management
    addDelegation(entry) {
        this.delegations.push(entry);
    }
    removeDelegation(fromUserId, toUserId, resource) {
        this.delegations = this.delegations.filter(d => !(d.fromUserId === fromUserId && d.toUserId === toUserId && (!resource || d.resource === resource)));
    }
    listDelegations(filter) {
        return this.delegations.filter(d => (!filter?.fromUserId || d.fromUserId === filter.fromUserId) &&
            (!filter?.toUserId || d.toUserId === filter.toUserId) &&
            (!filter?.resource || d.resource === filter.resource));
    }
    // Group management
    addGroup(group) {
        this.groups.push(group);
    }
    updateGroup(id, updates) {
        const g = this.groups.find(gr => gr.id === id);
        if (g)
            Object.assign(g, updates);
    }
    removeGroup(id) {
        this.groups = this.groups.filter(g => g.id !== id);
    }
    listGroups() {
        return this.groups;
    }
    addUserToGroup(groupId, userId) {
        const g = this.groups.find(gr => gr.id === groupId);
        if (g && !g.userIds.includes(userId))
            g.userIds.push(userId);
    }
    removeUserFromGroup(groupId, userId) {
        const g = this.groups.find(gr => gr.id === groupId);
        if (g)
            g.userIds = g.userIds.filter(u => u !== userId);
    }
    // ACL management
    setACL(entry) {
        const idx = this.acls.findIndex(e => e.userId === entry.userId && e.resource === entry.resource);
        if (idx !== -1)
            this.acls[idx] = entry;
        else
            this.acls.push(entry);
    }
    removeACL(userId, resource) {
        this.acls = this.acls.filter(e => !(e.userId === userId && e.resource === resource));
    }
    listACLs(filter) {
        return this.acls.filter(e => (!filter?.userId || e.userId === filter.userId) &&
            (!filter?.resource || e.resource === filter.resource));
    }
}
exports.RBAC = RBAC;
