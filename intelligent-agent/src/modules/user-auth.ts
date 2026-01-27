import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'manager' | 'user';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

const users: User[] = [];

export function createUser(username: string, password: string, role: UserRole = 'user') {
  const passwordHash = bcrypt.hashSync(password, 10);
  const user: User = {
    id: Math.random().toString(36).slice(2),
    username,
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  return user;
}

export function authenticate(username: string, password: string) {
  const user = users.find(u => u.username === username);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.passwordHash)) return null;
  return user;
}

export function getUserById(id: string) {
  return users.find(u => u.id === id);
}

export function listUsers() {
  return users;
}
