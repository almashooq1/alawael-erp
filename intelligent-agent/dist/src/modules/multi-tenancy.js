"use strict";
// src/modules/multi-tenancy.ts
// Multi-Tenancy Module (multi-client/company support)
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTenancy = void 0;
const tenants = [];
function generateId() {
    return 'T' + Math.random().toString(36).slice(2, 10);
}
class MultiTenancy {
    listTenants(ownerId) {
        return ownerId ? tenants.filter(t => t.ownerId === ownerId) : tenants;
    }
    getTenant(id) {
        return tenants.find(t => t.id === id);
    }
    createTenant(data) {
        const tenant = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            ...data,
        };
        tenants.push(tenant);
        return tenant;
    }
    updateTenant(id, data) {
        const t = tenants.find(t => t.id === id);
        if (!t)
            return null;
        Object.assign(t, data);
        return t;
    }
    deleteTenant(id) {
        const idx = tenants.findIndex(t => t.id === id);
        if (idx === -1)
            return false;
        tenants.splice(idx, 1);
        return true;
    }
}
exports.MultiTenancy = MultiTenancy;
