// وحدة إدارة ملفات المستخدمين (User Profile)
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles?: string[];
  notificationChannels?: {
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
    webhook?: string; // URL
  };
}

export class UserProfileManager {
  private users: Map<string, UserProfile> = new Map();

  addUser(user: UserProfile) {
    this.users.set(user.id, user);
  }

  getUser(id: string): UserProfile | undefined {
    return this.users.get(id);
  }

  listUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }
}
