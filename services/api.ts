/**
 * This service simulates a Supabase backend using localStorage.
 * Ideally, you would replace these functions with real Supabase SDK calls.
 */

import { Product, User, Order, UserRole, OrderStatus } from '../types';
import { INITIAL_PRODUCTS, INITIAL_USERS, INITIAL_ORDERS } from './mockData';

const STORAGE_KEYS = {
  PRODUCTS: 'dicompel_products',
  USERS: 'dicompel_users',
  ORDERS: 'dicompel_orders',
  SESSION: 'dicompel_session'
};

// --- Helpers ---
const getStorage = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

const setStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- Auth ---
export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));
    
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      const { password, ...safeUser } = user;
      setStorage(STORAGE_KEYS.SESSION, safeUser);
      return safeUser as User;
    }
    return null;
  },
  
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  }
};

// --- Products ---
export const productService = {
  getAll: async (): Promise<Product[]> => {
    return getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },
  
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const products = await productService.getAll();
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    products.push(newProduct);
    setStorage(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  },

  update: async (product: Product): Promise<void> => {
    const products = await productService.getAll();
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
      setStorage(STORAGE_KEYS.PRODUCTS, products);
    }
  },

  delete: async (id: string): Promise<void> => {
    const products = await productService.getAll();
    const filtered = products.filter(p => p.id !== id);
    setStorage(STORAGE_KEYS.PRODUCTS, filtered);
  },

  importCSV: async (csvText: string): Promise<void> => {
    const lines = csvText.split('\n');
    const products: Product[] = [];
    
    // Skip header row if exists, assume simple format:
    // Code, Description, Reference, Category, Subcategory, Line, Colors(comma sep)
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(',');
      if (cols.length >= 6) {
        products.push({
          id: Math.random().toString(36).substr(2, 9),
          code: cols[0]?.trim() || '',
          description: cols[1]?.trim() || '',
          reference: cols[2]?.trim() || '',
          category: cols[3]?.trim() || '',
          subcategory: cols[4]?.trim() || '',
          line: cols[5]?.trim() || '',
          colors: cols[6] ? cols[6].split('|').map(c => c.trim()) : [],
          imageUrl: 'https://picsum.photos/300/300' // Placeholder
        });
      }
    }

    const current = await productService.getAll();
    setStorage(STORAGE_KEYS.PRODUCTS, [...current, ...products]);
  }
};

// --- Orders ---
export const orderService = {
  getAll: async (): Promise<Order[]> => {
    return getStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  },

  getByRep: async (repId: string): Promise<Order[]> => {
    const all = await orderService.getAll();
    return all.filter(o => o.representativeId === repId);
  },

  create: async (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'interactions'>): Promise<Order> => {
    const orders = await orderService.getAll();
    const newOrder: Order = {
      ...order,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      status: OrderStatus.NEW,
      interactions: [
        {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          type: 'note',
          content: 'Pedido criado pelo cliente.',
          authorName: 'Sistema'
        }
      ]
    };
    orders.push(newOrder);
    setStorage(STORAGE_KEYS.ORDERS, orders);
    return newOrder;
  },

  update: async (order: Order): Promise<void> => {
    const orders = await orderService.getAll();
    const index = orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
      orders[index] = order;
      setStorage(STORAGE_KEYS.ORDERS, orders);
    }
  },

  delete: async (id: string): Promise<void> => {
    const orders = await orderService.getAll();
    const filtered = orders.filter(o => o.id !== id);
    setStorage(STORAGE_KEYS.ORDERS, filtered);
  }
};

// --- Users (Admin only) ---
export const userService = {
  getAll: async (): Promise<User[]> => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    return users.map(({ password, ...u }) => u as User); // return without password
  },

  getReps: async (): Promise<User[]> => {
    const users = await userService.getAll();
    return users.filter(u => u.role === UserRole.REPRESENTATIVE);
  },
  
  create: async (user: Omit<User, 'id'> & { password?: string }): Promise<User> => {
     const users = getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
     const newUser = { ...user, id: Math.random().toString(36).substr(2, 9), password: user.password || '123' };
     users.push(newUser);
     setStorage(STORAGE_KEYS.USERS, users);
     const { password, ...safeUser } = newUser;
     return safeUser;
  },

  update: async (user: User & { password?: string }): Promise<void> => {
     const users = getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
     const index = users.findIndex(u => u.id === user.id);
     if (index !== -1) {
       // Keep existing password if not provided
       const existingPassword = users[index].password;
       users[index] = { ...user, password: user.password || existingPassword };
       setStorage(STORAGE_KEYS.USERS, users);
     }
  },

  delete: async (id: string): Promise<void> => {
     const users = getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
     const filtered = users.filter(u => u.id !== id);
     setStorage(STORAGE_KEYS.USERS, filtered);
  }
};