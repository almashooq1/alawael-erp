// Delegation entry
export interface Delegation {
  fromUserId: string;
  toUserId: string;
  actions: string[];
  resource?: string;
  expiresAt?: string; // ISO date
}

export interface UserGroup {
  id: string;
  name: string;
  userIds: string[];
  roles: Role[];
}
export interface ACLEntry {
  userId: string;
  resource: string;
  actions: string[];
  expiresAt?: string; // ISO date
}

export class RBAC {
  private delegations: Delegation[] = [];
  private groups: UserGroup[] = [];
  private acls: ACLEntry[] = [];

  // Delegation management
  addDelegation(entry: Delegation) {
    this.delegations.push(entry);
  }
  removeDelegation(fromUserId: string, toUserId: string, resource?: string) {
    this.delegations = this.delegations.filter(d => !(d.fromUserId === fromUserId && d.toUserId === toUserId && (!resource || d.resource === resource)));
  }
  listDelegations(filter?: { fromUserId?: string; toUserId?: string; resource?: string }): Delegation[] {
    return this.delegations.filter(d =>
      (!filter?.fromUserId || d.fromUserId === filter.fromUserId) &&
      (!filter?.toUserId || d.toUserId === filter.toUserId) &&
      (!filter?.resource || d.resource === filter.resource)
    );
  }

  // Group management
  addGroup(group: UserGroup) {
    this.groups.push(group);
  }
  updateGroup(id: string, updates: Partial<UserGroup>) {
    const g = this.groups.find(gr => gr.id === id);
    if (g) Object.assign(g, updates);
  }
  removeGroup(id: string) {
    this.groups = this.groups.filter(g => g.id !== id);
  }
  listGroups(): UserGroup[] {
    return this.groups;
  }
  addUserToGroup(groupId: string, userId: string) {
    const g = this.groups.find(gr => gr.id === groupId);
    if (g && !g.userIds.includes(userId)) g.userIds.push(userId);
  }
  removeUserFromGroup(groupId: string, userId: string) {
    const g = this.groups.find(gr => gr.id === groupId);
    if (g) g.userIds = g.userIds.filter(u => u !== userId);
  }

  // ACL management
  setACL(entry: ACLEntry) {
    const idx = this.acls.findIndex(e => e.userId === entry.userId && e.resource === entry.resource);
    if (idx !== -1) this.acls[idx] = entry;
    else this.acls.push(entry);
  }
  removeACL(userId: string, resource: string) {
    this.acls = this.acls.filter(e => !(e.userId === userId && e.resource === resource));
  }
  listACLs(filter?: { userId?: string; resource?: string }): ACLEntry[] {
    return this.acls.filter(e =>
      (!filter?.userId || e.userId === filter.userId) &&
      (!filter?.resource || e.resource === filter.resource)
    );

  }

}

// نظام صلاحيات متقدم (RBAC)
export type Role = 'admin' | 'user' | 'guest';
export interface Permission {
  action: string;
  resource?: string;
  // Optional advanced conditions
  condition?: (user: User, context?: any) => boolean;
  timeRange?: { start: string; end: string }; // e.g. {start: '08:00', end: '17:00'}
  allowedLocations?: string[]; // e.g. country codes or city names
}

export interface User {
  id: string;
  roles: Role[];
}

