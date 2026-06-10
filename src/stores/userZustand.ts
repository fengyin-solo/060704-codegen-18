import { create } from 'zustand';
import type { User } from '@/types';
import { storage } from '@/utils/storage';
import { generateId } from '@/utils/id';

interface UserState {
  users: User[];
  currentUserId: string | null;
  visitingUserId: string | null;
  currentUser: User | null;
  visitingUser: User | null;
  publicUsers: User[];
  init: () => void;
  registerUser: (name: string, isPublic?: boolean) => User;
  login: (userId: string) => void;
  logout: () => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  startVisiting: (userId: string) => void;
  stopVisiting: () => void;
  getUserById: (userId: string) => User | undefined;
  createDefaultUsers: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  currentUserId: null,
  visitingUserId: null,

  get currentUser() {
    const { currentUserId, users } = get();
    if (!currentUserId) return null;
    return users.find(u => u.id === currentUserId) || null;
  },

  get visitingUser() {
    const { visitingUserId, users } = get();
    if (!visitingUserId) return null;
    return users.find(u => u.id === visitingUserId) || null;
  },

  get publicUsers() {
    const { users, currentUserId } = get();
    return users.filter(u => u.isPublic && u.id !== currentUserId);
  },

  init: () => {
    const users = storage.getUsers();
    const currentUserId = storage.getCurrentUser();
    
    set({ users, currentUserId });
    
    if (users.length === 0) {
      get().createDefaultUsers();
    }
  },

  createDefaultUsers: () => {
    const defaultUsers: User[] = [
      {
        id: generateId(),
        name: '故障收藏家',
        bio: '收集各种数字腐朽之美',
        isPublic: true,
        tombstoneStyle: 'default'
      },
      {
        id: generateId(),
        name: '时间旅人',
        bio: '在时间轴上漫步的陌生人',
        isPublic: true,
        tombstoneStyle: 'retro'
      }
    ];
    set({ users: defaultUsers });
    storage.saveUsers(defaultUsers);
  },

  registerUser: (name: string, isPublic: boolean = true) => {
    const { users } = get();
    const existingUser = users.find(u => u.name === name);
    if (existingUser) {
      return existingUser;
    }
    
    const newUser: User = {
      id: generateId(),
      name,
      isPublic,
      tombstoneStyle: 'default'
    };
    
    const newUsers = [...users, newUser];
    set({ users: newUsers });
    storage.saveUsers(newUsers);
    
    return newUser;
  },

  login: (userId: string) => {
    set({ currentUserId: userId });
    storage.setCurrentUser(userId);
  },

  logout: () => {
    set({ currentUserId: null });
    storage.setCurrentUser(null);
  },

  updateUser: (userId: string, updates: Partial<User>) => {
    const { users } = get();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      const newUsers = [...users];
      newUsers[index] = { ...newUsers[index], ...updates };
      set({ users: newUsers });
      storage.saveUsers(newUsers);
    }
  },

  startVisiting: (userId: string) => {
    set({ visitingUserId: userId });
  },

  stopVisiting: () => {
    set({ visitingUserId: null });
  },

  getUserById: (userId: string) => {
    const { users } = get();
    return users.find(u => u.id === userId);
  }
}));
