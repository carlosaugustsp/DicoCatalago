
import { Product, User, Order, UserRole, OrderStatus, CartItem } from '../types';
import { supabase } from './supabaseClient';
import { INITIAL_USERS, INITIAL_PRODUCTS } from './mockData';

const PRODUCTS_STORAGE_KEY = 'dicompel_products_db';
const PROFILES_STORAGE_KEY = 'dicompel_profiles_db';

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
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          const user: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: profile.name,
            role: profile.role as UserRole,
          };
          localStorage.setItem('dicompel_user', JSON.stringify(user));
          return user;
        }
      }
    } catch (err) {
      console.warn("Supabase Auth indisponível.");
    }

    const mockUser = INITIAL_USERS.find(u => u.email.trim().toLowerCase() === cleanEmail && u.password === password);
    if (mockUser) {
      const safeUser = { ...mockUser };
      delete (safeUser as any).password;
      localStorage.setItem('dicompel_user', JSON.stringify(safeUser));
      return safeUser as User;
    }
    return null;
  },
  
  updatePassword: async (newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return !error;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try { await supabase.auth.signOut(); } catch {}
    localStorage.removeItem('dicompel_user');
  },

  getCurrentUser: (): User | null => {
    try {
      const stored = localStorage.getItem('dicompel_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }
};

export const productService = {
  getAll: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('description');
      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          code: p.code,
          description: p.description,
          reference: p.reference,
          colors: Array.isArray(p.colors) ? p.colors : [],
          imageUrl: p.image_url || 'https://picsum.photos/300/300?random=' + p.id,
          category: p.category,
          subcategory: p.subcategory,
          line: p.line,
          amperage: p.amperage,
          details: p.details 
        }));
      }
    } catch (err) {}
    const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
    return local.length > 0 ? local : INITIAL_PRODUCTS;
  },
  
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const newId = 'prod_' + Date.now();
    try {
      const { data, error } = await supabase.from('products').insert([{
        code: product.code,
        description: product.description,
        reference: product.reference,
        colors: product.colors,
        image_url: product.imageUrl,
        category: product.category,
        subcategory: product.subcategory,
        line: product.line,
        amperage: product.amperage,
        details: product.details
      }]).select().single();
      if (!error && data) return { ...product, id: data.id };
    } catch {}
    const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
    const newProduct = { ...product, id: newId };
    saveLocalData(PRODUCTS_STORAGE_KEY, [...local, newProduct]);
    return newProduct;
  },

  update: async (product: Product): Promise<void> => {
    try {
      await supabase.from('products').update({
        code: product.code,
        description: product.description,
        reference: product.reference,
        colors: product.colors,
        image_url: product.imageUrl,
        category: product.category,
        subcategory: product.subcategory,
        line: product.line,
        amperage: product.amperage,
        details: product.details 
      }).eq('id', product.id);
    } catch {}
    const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
    saveLocalData(PRODUCTS_STORAGE_KEY, local.map(p => p.id === product.id ? product : p));
  },

  delete: async (id: string): Promise<void> => {
    try { await supabase.from('products').delete().eq('id', id); } catch {}
    const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
    saveLocalData(PRODUCTS_STORAGE_KEY, local.filter(p => p.id !== id));
  }
};

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*)), interactions(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((order: any) => ({
          id: order.id,
          createdAt: order.created_at,
          status: order.status as OrderStatus,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerContact: order.customer_contact,
          notes: order.notes,
          representativeId: order.representative_id,
          interactions: order.interactions || [],
          items: order.order_items ? order.order_items.map((item: any) => ({
            ...(item.products || {}),
            quantity: item.quantity
          })) : []
        }));
      }
    } catch (err) {}
    return [];
  },

  getByRep: async (repId: string): Promise<Order[]> => {
    const all = await orderService.getAll();
    return all.filter(o => o.representativeId === repId);
  },

  create: async (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'interactions'>): Promise<Order> => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          representative_id: order.representativeId,
          customer_name: order.customerName,
          customer_email: order.customerEmail,
          customer_contact: order.customerContact,
          notes: order.notes,
          status: OrderStatus.NEW
        }])
        .select().single();
      
      if (!orderError && orderData) {
        const itemsToInsert = order.items.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            quantity: item.quantity
        }));
        await supabase.from('order_items').insert(itemsToInsert);
        return { ...order, id: orderData.id, status: OrderStatus.NEW, createdAt: orderData.created_at, interactions: [] };
      }
    } catch {}
    return { ...order, id: 'mock_' + Date.now(), status: OrderStatus.NEW, createdAt: new Date().toISOString(), interactions: [] };
  },

  update: async (order: Order): Promise<void> => {
    try { 
      await supabase.from('orders').update({ 
        status: order.status, 
        notes: order.notes,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        customer_contact: order.customerContact
      }).eq('id', order.id);

      if (order.items && order.items.length > 0) {
        await supabase.from('order_items').delete().eq('order_id', order.id);
        const itemsToInsert = order.items.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity
        }));
        await supabase.from('order_items').insert(itemsToInsert);
      }
    } catch {}
  },

  delete: async (id: string): Promise<void> => {
    try { await supabase.from('orders').delete().eq('id', id); } catch {}
  }
};

export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
       const { data, error } = await supabase.from('profiles').select('*');
       if (!error && data && data.length > 0) {
         return data.map((p: any) => ({
           id: p.id, email: p.email, name: p.name, role: p.role as UserRole
         }));
       }
    } catch {}
    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    return local.length > 0 ? local : INITIAL_USERS;
  },

  getReps: async (): Promise<User[]> => {
    const users = await userService.getAll();
    return users.filter(u => u.role === UserRole.REPRESENTATIVE);
  },
  
  create: async (user: any): Promise<User> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email, password: user.password,
        options: { data: { name: user.name, role: user.role } }
      });
      if (!authError && authData.user) {
        await supabase.from('profiles').upsert([{ id: authData.user.id, name: user.name, email: user.email, role: user.role }]);
        return { ...user, id: authData.user.id };
      }
    } catch {}
    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    const newUser = { ...user, id: 'user_' + Date.now() };
    saveLocalData(PROFILES_STORAGE_KEY, [...local, newUser]);
    return newUser;
  },

  update: async (user: User & { password?: string }): Promise<void> => {
    try { 
      await supabase.from('profiles').update({ name: user.name, role: user.role }).eq('id', user.id);
      
      // Se tiver nova senha enviada por Admin/Supervisor, em um ambiente real usaria a Admin API do Supabase.
      // No frontend simulamos atualizando os dados locais e tentando atualizar o auth se for o próprio usuário.
      if (user.password && user.password.trim() !== "") {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && currentUser.id === user.id) {
            await supabase.auth.updateUser({ password: user.password });
        }
      }
    } catch {}
    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    saveLocalData(PROFILES_STORAGE_KEY, local.map(u => u.id === user.id ? { ...u, name: user.name, role: user.role, password: user.password } : u));
  },

  delete: async (id: string): Promise<void> => {
    try { await supabase.from('profiles').delete().eq('id', id); } catch {}
    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    saveLocalData(PROFILES_STORAGE_KEY, local.filter(u => u.id !== id));
  }
};
