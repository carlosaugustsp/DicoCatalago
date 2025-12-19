
import { Product, User, Order, UserRole, OrderStatus, CartItem } from '../types';
import { supabase } from './supabaseClient';
import { INITIAL_USERS } from './mockData';

const PRODUCTS_STORAGE_KEY = 'dicompel_products_db';

const getLocalData = <T>(key: string): T[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (!error && data.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
          const user: User = { id: data.user.id, email: data.user.email || '', name: profile.name, role: profile.role as UserRole };
          localStorage.setItem('dicompel_user', JSON.stringify(user));
          return user;
        }
      }
      if (error) console.error("Login Error:", error.message);
    } catch (err) {
      console.warn("Conexão falhou no login, tentando mock...");
    }
    const mockUser = INITIAL_USERS.find(u => u.email.trim().toLowerCase() === cleanEmail && u.password === password);
    if (mockUser) {
      const { password: _, ...safeUser } = mockUser;
      localStorage.setItem('dicompel_user', JSON.stringify(safeUser));
      return safeUser as User;
    }
    return null;
  },
  logout: async () => { await supabase.auth.signOut(); localStorage.removeItem('dicompel_user'); },
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
      if (!error && data) {
        return data.map((p: any) => ({
          id: p.id, code: p.code, description: p.description, reference: p.reference,
          colors: Array.isArray(p.colors) ? p.colors : [], imageUrl: p.image_url,
          category: p.category, subcategory: p.subcategory, line: p.line,
          amperage: p.amperage, details: p.details 
        }));
      }
      if (error) console.error("Product fetch error:", error.message);
    } catch (err) { console.error("DB Error:", err); }
    return getLocalData<Product>(PRODUCTS_STORAGE_KEY);
  },
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const dbProduct = {
      code: product.code, description: product.description, reference: product.reference,
      colors: product.colors, image_url: product.imageUrl, category: product.category,
      subcategory: product.subcategory, line: product.line, amperage: product.amperage, details: product.details
    };
    const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
    if (error) {
      const msg = `Erro ao cadastrar produto: ${error.message}${error.details ? ' - ' + error.details : ''}`;
      console.error(msg);
      throw new Error(msg);
    }
    return { ...product, id: data.id };
  },
  update: async (product: Product): Promise<void> => {
    const dbProduct = {
      code: product.code, description: product.description, reference: product.reference,
      colors: product.colors, image_url: product.imageUrl, category: product.category,
      subcategory: product.subcategory, line: product.line, amperage: product.amperage, details: product.details 
    };
    const { error } = await supabase.from('products').update(dbProduct).eq('id', product.id);
    if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(`Erro ao deletar: ${error.message}`);
  }
};

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*)), interactions(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((order: any) => ({
        id: order.id, createdAt: order.created_at, status: order.status as OrderStatus,
        customerName: order.customer_name, customerContact: order.customer_contact,
        notes: order.notes, representativeId: order.representative_id,
        interactions: order.interactions || [],
        items: order.order_items ? order.order_items.map((item: any) => ({
          ...(item.products || {}), quantity: item.quantity
        })) : []
      }));
    } catch (err: any) { console.error("Order fetch error:", err.message); return []; }
  },
  getByRep: async (repId: string): Promise<Order[]> => {
    const all = await orderService.getAll();
    return all.filter(o => o.representativeId === repId);
  },
  create: async (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'interactions'>): Promise<Order> => {
    const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
      representative_id: order.representativeId,
      customer_name: order.customerName,
      customer_contact: order.customerContact,
      notes: order.notes,
      status: OrderStatus.NEW
    }]).select().single();
    
    if (orderError) {
      const msg = `Erro no Pedido: ${orderError.message}${orderError.details ? ' - ' + orderError.details : ''}`;
      console.error(msg);
      throw new Error(msg);
    }

    const itemsToInsert = order.items.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) {
      console.error("Erro nos Itens:", itemsError.message);
      throw new Error(`Pedido criado mas itens falharam: ${itemsError.message}`);
    }

    return { ...order, id: orderData.id, status: OrderStatus.NEW, createdAt: orderData.created_at, interactions: [] };
  },
  update: async (order: Order): Promise<void> => {
    await supabase.from('orders').update({ status: order.status, notes: order.notes }).eq('id', order.id);
  },
  delete: async (id: string): Promise<void> => {
    await supabase.from('orders').delete().eq('id', id);
  }
};

export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) return data.map((p: any) => ({ id: p.id, email: p.email, name: p.name, role: p.role as UserRole }));
    } catch {}
    return INITIAL_USERS;
  },
  getReps: async (): Promise<User[]> => {
    const users = await userService.getAll();
    return users.filter(u => u.role === UserRole.REPRESENTATIVE);
  },
  create: async (user: any): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email, password: user.password,
      options: { data: { name: user.name, role: user.role } }
    });
    if (authError) throw new Error(`Erro Auth: ${authError.message}`);
    const { error: profileError } = await supabase.from('profiles').upsert([{
      id: authData.user!.id, name: user.name, email: user.email, role: user.role
    }]);
    if (profileError) throw new Error(`Erro Perfil: ${profileError.message}`);
    return { ...user, id: authData.user!.id };
  },
  update: async (user: User): Promise<void> => {
    await supabase.from('profiles').update({ name: user.name, role: user.role }).eq('id', user.id);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
};
