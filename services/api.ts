
import { Product, User, UserRole, Order, OrderStatus } from '../types';
import { supabase } from './supabaseClient';
import { INITIAL_USERS, INITIAL_PRODUCTS } from './mockData';

const PRODUCTS_STORAGE_KEY = 'dicompel_products_db';
const PROFILES_STORAGE_KEY = 'dicompel_profiles_db';
const ORDERS_STORAGE_KEY = 'dicompel_orders_db';

const getLocalData = <T>(key: string): T[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const saveLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (!error && data.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
          const user: User = { id: data.user.id, email: data.user.email || '', name: profile.name || 'Usuário', role: (profile.role as UserRole) || UserRole.REPRESENTATIVE };
          localStorage.setItem('dicompel_user', JSON.stringify(user));
          return user;
        }
      }
    } catch (err) { console.warn("Supabase Auth offline."); }

    const allUsers = getLocalData<User>(PROFILES_STORAGE_KEY).length > 0 ? getLocalData<User>(PROFILES_STORAGE_KEY) : INITIAL_USERS;
    const mock = allUsers.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
    if (mock) {
      const { password, ...safe } = mock;
      localStorage.setItem('dicompel_user', JSON.stringify(safe));
      return safe as User;
    }
    return null;
  },
  logout: async () => { try { await supabase.auth.signOut(); } catch {} localStorage.removeItem('dicompel_user'); },
  getCurrentUser: (): User | null => { try { return JSON.parse(localStorage.getItem('dicompel_user') || 'null'); } catch { return null; } }
};

export const productService = {
  getAll: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('description');
      if (!error && data) {
        return data.map((p: any) => ({
          id: String(p.id),
          code: p.code || '',
          description: p.description || '',
          reference: p.reference || '',
          colors: Array.isArray(p.colors) ? p.colors : [],
          imageUrl: p.image_url || 'https://picsum.photos/300/300?random=' + p.id,
          category: p.category || '',
          subcategory: p.subcategory || '',
          line: p.line || '',
          amperage: p.amperage || '',
          details: p.details || ''
        }));
      }
    } catch {}
    return getLocalData<Product>(PRODUCTS_STORAGE_KEY).length > 0 ? getLocalData<Product>(PRODUCTS_STORAGE_KEY) : INITIAL_PRODUCTS;
  },
  create: async (p: Omit<Product, 'id'>): Promise<Product> => {
    const payload = { code: p.code, description: p.description, reference: p.reference, colors: p.colors, image_url: p.imageUrl, category: p.category, subcategory: p.subcategory, line: p.line, amperage: p.amperage, details: p.details };
    try {
      const { data, error } = await supabase.from('products').insert([payload]).select().single();
      if (data && !error) {
        const np = { ...p, id: String(data.id) };
        saveLocalData(PRODUCTS_STORAGE_KEY, [...getLocalData<Product>(PRODUCTS_STORAGE_KEY), np]);
        return np as Product;
      }
    } catch {}
    const np = { ...p, id: 'p_' + Date.now() } as Product;
    saveLocalData(PRODUCTS_STORAGE_KEY, [...getLocalData<Product>(PRODUCTS_STORAGE_KEY), np]);
    return np;
  },
  update: async (p: Product): Promise<void> => {
    try {
      await supabase.from('products').update({ code: p.code, description: p.description, reference: p.reference, image_url: p.imageUrl, line: p.line, amperage: p.amperage, details: p.details }).eq('id', p.id);
    } catch {}
    saveLocalData(PRODUCTS_STORAGE_KEY, getLocalData<Product>(PRODUCTS_STORAGE_KEY).map(i => i.id === p.id ? p : i));
  }
};

export const userService = {
  getAll: async (): Promise<User[]> => {
    try { const { data } = await supabase.from('profiles').select('*'); if(data) return data; } catch {}
    return getLocalData<User>(PROFILES_STORAGE_KEY).length > 0 ? getLocalData<User>(PROFILES_STORAGE_KEY) : INITIAL_USERS;
  },
  getReps: async () => (await userService.getAll()).filter(u => u.role === UserRole.REPRESENTATIVE)
};

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data } = await supabase.from('orders').select('*, order_items(*, products(*))').order('created_at', { ascending: false });
      if (data) return data.map((o: any) => ({
        id: o.id, createdAt: o.created_at, status: o.status, customerName: o.customer_name, representativeId: o.representative_id, notes: o.notes, interactions: [], items: (o.order_items || []).map((i: any) => ({ ...(i.products || {}), quantity: i.quantity }))
      }));
    } catch {}
    return getLocalData<Order>(ORDERS_STORAGE_KEY);
  },
  getByRep: async (id: string) => (await orderService.getAll()).filter(o => o.representativeId === id),
  create: async (o: any): Promise<Order> => {
    const no = { ...o, id: 'o_' + Date.now(), status: 'Novo', createdAt: new Date().toISOString(), interactions: [] };
    try {
      const { data } = await supabase.from('orders').insert([{ representative_id: o.representativeId, customer_name: o.customerName, notes: o.notes, status: 'Novo' }]).select().single();
      if (data) no.id = data.id;
    } catch {}
    saveLocalData(ORDERS_STORAGE_KEY, [no, ...getLocalData<Order>(ORDERS_STORAGE_KEY)]);
    return no;
  }
};
