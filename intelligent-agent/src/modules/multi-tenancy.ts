// src/modules/multi-tenancy.ts
// Multi-Tenancy Module (multi-client/company support)

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  settings?: Record<string, any>;
  branding?: Record<string, any>;
}

const tenants: Tenant[] = [];

function generateId() {
  return 'T' + Math.random().toString(36).slice(2, 10);
}

export class MultiTenancy {
  listTenants(ownerId?: string) {
    return ownerId ? tenants.filter(t => t.ownerId === ownerId) : tenants;
  }
  getTenant(id: string) {
    return tenants.find(t => t.id === id);
  }
  createTenant(data: Omit<Tenant, 'id' | 'createdAt'>) {
    const tenant: Tenant = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    tenants.push(tenant);
    return tenant;
  }
  updateTenant(id: string, data: Partial<Omit<Tenant, 'id' | 'createdAt'>>) {
    const t = tenants.find(t => t.id === id);
    if (!t) return null;
    Object.assign(t, data);
    return t;
  }
  deleteTenant(id: string) {
    const idx = tenants.findIndex(t => t.id === id);
    if (idx === -1) return false;
    tenants.splice(idx, 1);
    return true;
  }
}
