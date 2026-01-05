
import { Product, User, UserRole, Order, OrderStatus, CartItem } from '../types';
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
            name: profile.name || 'Usuário',
            role: (profile.role as UserRole) || UserRole.REPRESENTATIVE,
          };
          localStorage.setItem('dicompel_user', JSON.stringify(user));
          return user;
        }
      }
    } catch (err) {
      console.warn("Supabase Auth indisponível.");
    }

    const localUsers = getLocalData<User>(PROFILES_STORAGE_KEY);
    // Só usa INITIAL_USERS como fallback se for o admin padrão para primeiro acesso
    const allUsers = localUsers.length > 0 ? localUsers : INITIAL_USERS;
    const mockUser = allUsers.find(u => (u.email || '').trim().toLowerCase() === cleanEmail && u.password === password);
    
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
    } catch { return false; }
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
    let allProducts: Product[] = [];

    try {
      const { data, error } = await supabase.from('products').select('*').order('description');
      if (!error && data && data.length > 0) {
        allProducts = data.map((p: any) => ({
          id: String(p.id),
          code: String(p.code || ''),
          description: String(p.description || ''),
          reference: String(p.reference || ''),
          colors: Array.isArray(p.colors) ? p.colors : (p.colors ? String(p.colors).split(',') : []),
          imageUrl: p.image_url || 'https://picsum.photos/300/300?random=' + p.id,
          category: String(p.category || ''),
          subcategory: String(p.subcategory || ''),
          line: String(p.line || ''),
          amperage: p.amperage || '',
          details: p.details || ''
        }));
      }
    } catch (err) {}
    
    if (allProducts.length === 0) {
      const localData = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
      allProducts = localData.length > 0 ? localData : INITIAL_PRODUCTS;
    }
    return allProducts;
  },
  
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const payload = {
      code: String(product.code || '').trim(),
      description: String(product.description || '').trim(),
      reference: String(product.reference || '').trim(),
      colors: product.colors || [],
      image_url: product.imageUrl || '',
      category: String(product.category || '').trim(),
      subcategory: String(product.subcategory || '').trim(),
      line: String(product.line || '').trim(),
      amperage: product.amperage || '',
      details: product.details || ''
    };

    try {
      const { data, error } = await supabase.from('products').insert([payload]).select().single();
      if (data && !error) {
        const productWithDbId = { ...product, id: String(data.id) };
        const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
        saveLocalData(PRODUCTS_STORAGE_KEY, [...local, productWithDbId]);
        return productWithDbId;
      }
    } catch (err) {}

    const localId = 'p_local_' + Date.now();
    const newLocalProd = { ...product, id: localId };
    const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
    saveLocalData(PRODUCTS_STORAGE_KEY, [...local, newLocalProd]);
    return newLocalProd;
  },

  update: async (product: Product): Promise<void> => {
    try {
      await supabase.from('products').update({
        code: product.code || '',
        description: product.description || '',
        reference: product.reference || '',
        colors: product.colors || [],
        image_url: product.imageUrl || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        line: product.line || '',
        amperage: product.amperage || '',
        details: product.details || ''
      }).eq('id', product.id);
    } catch (err) {}
    
    const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
    saveLocalData(PRODUCTS_STORAGE_KEY, local.map(p => p.id === product.id ? product : p));
  },

  delete: async (id: string): Promise<void> => {
    try { await supabase.from('products').delete().eq('id', id); } catch (err) {}
    const local = getLocalData<Product>(PRODUCTS_STORAGE_KEY);
    saveLocalData(PRODUCTS_STORAGE_KEY, local.filter(p => p.id !== id));
  }
};

export const userService = {
  getAll: async (): Promise<User[]> => {
    let usersList: User[] = [];
    try {
       const { data, error } = await supabase.from('profiles').select('*');
       if (!error && data && data.length > 0) {
         usersList = data.map((p: any) => ({
           id: p.id, 
           email: p.email, 
           name: p.name || 'Membro', 
           role: (p.role as UserRole) || UserRole.REPRESENTATIVE
         }));
       }
    } catch (err) {}

    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    const combined = [...usersList];
    local.forEach(l => {
      if (!combined.some(c => c.id === l.id || c.email.toLowerCase() === l.email.toLowerCase())) {
        combined.push(l);
      }
    });

    // Removido o retorno de INITIAL_USERS para evitar usuários de teste em produção
    return combined;
  },

  getReps: async (): Promise<User[]> => {
    const users = await userService.getAll();
    return users.filter(u => u.role === UserRole.REPRESENTATIVE);
  },

  create: async (user: Omit<User, 'id'>): Promise<User> => {
    const localId = 'u_local_' + Date.now();
    const newUser = { ...user, id: localId };
    
    try {
      const { data, error } = await supabase.from('profiles').insert([{
        email: user.email,
        name: user.name,
        role: user.role
      }]).select().single();
      if (data && !error) {
        newUser.id = data.id;
      }
    } catch (err) {}

    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    saveLocalData(PROFILES_STORAGE_KEY, [...local, newUser]);
    return newUser;
  },

  update: async (user: User): Promise<void> => {
    try {
      await supabase.from('profiles').update({
        email: user.email,
        name: user.name,
        role: user.role
      }).eq('id', user.id);
    } catch (err) {}

    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    saveLocalData(PROFILES_STORAGE_KEY, local.map(u => u.id === user.id ? user : u));
  },

  delete: async (id: string): Promise<void> => {
    try { await supabase.from('profiles').delete().eq('id', id); } catch (err) {}
    const local = getLocalData<User>(PROFILES_STORAGE_KEY);
    saveLocalData(PROFILES_STORAGE_KEY, local.filter(u => u.id !== id));
  }
};

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    let supabaseOrders: Order[] = [];
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*)), interactions(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        supabaseOrders = data.map((order: any) => ({
          id: order.id,
          createdAt: order.created_at,
          status: (order.status as OrderStatus) || OrderStatus.NEW,
          customerName: order.customer_name || 'Cliente',
          customerEmail: order.customer_email || '',
          customerContact: order.customer_contact || '',
          notes: order.notes || '',
          representativeId: order.representative_id,
          interactions: order.interactions || [],
          items: order.order_items ? order.order_items.map((item: any) => ({
            ...(item.products || {}),
            id: item.product_id, 
            quantity: item.quantity || 1
          })) : []
        }));
      }
    } catch (err) {}
    
    const localOrders = getLocalData<Order>(ORDERS_STORAGE_KEY);
    const combined = [...supabaseOrders];
    localOrders.forEach(local => {
      if (!combined.find(c => c.id === local.id)) combined.push(local);
    });
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getByRep: async (repId: string): Promise<Order[]> => {
    const all = await orderService.getAll();
    return all.filter(o => o.representativeId === repId);
  },

  create: async (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'interactions'>): Promise<Order> => {
    const newOrder: Order = {
      ...order,
      id: 'ord_' + Date.now(),
      status: OrderStatus.NEW,
      createdAt: new Date().toISOString(),
      interactions: []
    };

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
        newOrder.id = orderData.id;
        newOrder.createdAt = orderData.created_at;
      }
    } catch (err) {}

    const local = getLocalData<Order>(ORDERS_STORAGE_KEY);
    saveLocalData(ORDERS_STORAGE_KEY, [newOrder, ...local]);
    return newOrder;
  },

  update: async (order: Order): Promise<void> => {
    try {
      await supabase.from('orders').update({
        status: order.status,
        notes: order.notes
      }).eq('id', order.id);
    } catch (err) {}

    const local = getLocalData<Order>(ORDERS_STORAGE_KEY);
    saveLocalData(ORDERS_STORAGE_KEY, local.map(o => o.id === order.id ? order : o));
  },

  delete: async (id: string): Promise<void> => {
    try {
      await supabase.from('order_items').delete().eq('order_id', id);
      await supabase.from('orders').delete().eq('id', id);
    } catch (err) {}
    const local = getLocalData<Order>(ORDERS_STORAGE_KEY);
    saveLocalData(ORDERS_STORAGE_KEY, local.filter(o => o.id !== id));
  }
};
