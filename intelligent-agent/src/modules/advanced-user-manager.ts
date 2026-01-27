// Advanced User Manager Module
export type UserStatus = 'active' | 'suspended' | 'frozen';
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: string;
}
export interface UserActivity {
  userId: string;
  action: string;
  timestamp: string;
  details?: any;
}

export class AdvancedUserManager {
  private users: ManagedUser[] = [];
  private activityLog: UserActivity[] = [];

  addUser(user: Omit<ManagedUser, 'createdAt' | 'status'>) {
    const u: ManagedUser = { ...user, status: 'active', createdAt: new Date().toISOString() };
    this.users.push(u);
    return u;
  }
  setStatus(userId: string, status: UserStatus) {
    const u = this.users.find(x => x.id === userId);
    if (u) u.status = status;
  }
  getUser(userId: string) {
    return this.users.find(x => x.id === userId);
  }
  listUsers() {
    return this.users;
  }
  logActivity(activity: UserActivity) {
    this.activityLog.push(activity);
  }
  getUserActivity(userId: string) {
    return this.activityLog.filter(a => a.userId === userId);
  }
}
