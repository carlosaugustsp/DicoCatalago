
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
  updatePassword: async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true, message: "Senha atualizada com sucesso!" };
    } catch (err: any) {
      console.error("Erro Supabase Auth:", err);
      return { success: false, message: err.message || "Falha ao atualizar senha no servidor." };
    }
  },
  logout: async () => { try { await supabase.auth.signOut(); } catch {} localStorage.removeItem('dicompel_user'); },
  getCurrentUser: (): User | null => { try { return JSON.parse(localStorage.getItem('dicompel_user') || 'null'); } catch { return null; } }
};

export const productService = {
  getAll: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('description');
      if (!error && data && data.length > 0) {
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
    try { const { data } = await supabase.from('profiles').select('*'); if(data && data.length > 0) return data; } catch {}
    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    return local.length > 0 ? local : INITIAL_USERS;
  },
  getReps: async () => (await userService.getAll()).filter(u => u.role === UserRole.REPRESENTATIVE),
  create: async (u: Omit<User, 'id'>): Promise<User> => {
    try {
      const { data, error } = await supabase.from('profiles').insert([{ name: u.name, email: u.email, role: u.role }]).select().single();
      if (data && !error) {
        const nu = { ...u, id: data.id };
        saveLocalData(PROFILES_STORAGE_KEY, [...getLocalData<User>(PROFILES_STORAGE_KEY), nu]);
        return nu as User;
      }
    } catch {}
    const nu = { ...u, id: 'u_' + Date.now() } as User;
    const current = getLocalData<User>(PROFILES_STORAGE_KEY).length > 0 ? getLocalData<User>(PROFILES_STORAGE_KEY) : INITIAL_USERS;
    saveLocalData(PROFILES_STORAGE_KEY, [...current, nu]);
    return nu;
  },
  update: async (u: User): Promise<void> => {
    try {
      // Atualiza no Supabase Profiles
      const { error } = await supabase.from('profiles')
        .update({ name: u.name, email: u.email, role: u.role })
        .eq('id', u.id);
      
      if (error) throw error;
    } catch (err) { 
      console.warn("Falha ao atualizar no Supabase, tentando local...", err); 
    }
    
    // Fallback/Sincronização LocalStorage
    const current = getLocalData<User>(PROFILES_STORAGE_KEY).length > 0 ? getLocalData<User>(PROFILES_STORAGE_KEY) : INITIAL_USERS;
    saveLocalData(PROFILES_STORAGE_KEY, current.map(item => item.id === u.id ? u : item));
    
    // Se o usuário editado for o próprio usuário logado, atualiza o storage de sessão
    const loggedUser = authService.getCurrentUser();
    if (loggedUser && loggedUser.id === u.id) {
      localStorage.setItem('dicompel_user', JSON.stringify({ ...loggedUser, name: u.name, role: u.role }));
    }
  },
  delete: async (id: string): Promise<void> => {
    try {
      await supabase.from('profiles').delete().eq('id', id);
    } catch {}
    const current = getLocalData<User>(PROFILES_STORAGE_KEY).length > 0 ? getLocalData<User>(PROFILES_STORAGE_KEY) : INITIAL_USERS;
    saveLocalData(PROFILES_STORAGE_KEY, current.filter(u => u.id !== id));
  }
};

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data.map((o: any) => ({
        id: o.id, 
        createdAt: o.created_at, 
        status: o.status, 
        customerName: o.customer_name, 
        customerContact: o.customer_contact,
        customerEmail: o.customer_email,
        representativeId: o.representative_id, 
        notes: o.notes, 
        interactions: [], 
        items: (o.order_items || []).map((i: any) => ({ 
          id: i.products?.id || 'p_unknown',
          code: i.products?.code || '',
          description: i.products?.description || '',
          reference: i.products?.reference || '',
          line: i.products?.line || '',
          imageUrl: i.products?.image_url || 'https://picsum.photos/300/300',
          quantity: i.quantity 
        }))
      }));
    } catch {}
    return getLocalData<Order>(ORDERS_STORAGE_KEY);
  },
  getByRep: async (id: string) => (await orderService.getAll()).filter(o => o.representativeId === id),
  create: async (o: any): Promise<Order> => {
    const no: Order = { 
      ...o, 
      id: 'o_' + Date.now(), 
      status: OrderStatus.NEW, 
      createdAt: new Date().toISOString(), 
      interactions: [],
      items: o.items || []
    };
    try {
      const { data, error } = await supabase.from('orders').insert([{ 
        representative_id: o.representativeId, 
        customer_name: o.customerName, 
        customer_contact: o.customerContact,
        customer_email: o.customerEmail,
        notes: o.notes, 
        status: 'Novo' 
      }]).select().single();
      
      if (data && !error) {
        no.id = data.id;
        if (o.items && o.items.length > 0) {
           const itemsPayload = o.items.map((it: any) => ({ order_id: data.id, product_id: it.id, quantity: it.quantity }));
           await supabase.from('order_items').insert(itemsPayload);
        }
      }
    } catch (err) {
      console.warn("Supabase Insert failed, using local storage only.");
    }
    saveLocalData(ORDERS_STORAGE_KEY, [no, ...getLocalData<Order>(ORDERS_STORAGE_KEY)]);
    return no;
  },
  update: async (o: Order): Promise<void> => {
    try {
      await supabase.from('orders').update({
        customer_name: o.customerName,
        customer_contact: o.customerContact,
        customer_email: o.customerEmail,
        notes: o.notes,
        status: o.status
      }).eq('id', o.id);

      await supabase.from('order_items').delete().eq('order_id', o.id);
      if (o.items && o.items.length > 0) {
        const itemsPayload = o.items.map((it: any) => ({ order_id: o.id, product_id: it.id, quantity: it.quantity }));
        await supabase.from('order_items').insert(itemsPayload);
      }
    } catch {}
    const local = getLocalData<Order>(ORDERS_STORAGE_KEY);
    saveLocalData(ORDERS_STORAGE_KEY, local.map(item => item.id === o.id ? o : item));
  },
  updateStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    try {
      await supabase.from('orders').update({ status }).eq('id', orderId);
    } catch {}
    const local = getLocalData<Order>(ORDERS_STORAGE_KEY);
    saveLocalData(ORDERS_STORAGE_KEY, local.map(o => o.id === orderId ? { ...o, status } : o));
  },
  delete: async (orderId: string): Promise<void> => {
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
    } catch {}
    const local = getLocalData<Order>(ORDERS_STORAGE_KEY);
    saveLocalData(ORDERS_STORAGE_KEY, local.filter(o => o.id !== orderId));
  }
};
