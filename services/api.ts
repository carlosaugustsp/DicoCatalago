import { Product, User, Order, UserRole, OrderStatus, CartItem } from '../types';
import { supabase } from './supabaseClient';
import { INITIAL_PRODUCTS, INITIAL_USERS, INITIAL_ORDERS } from './mockData';

// --- Helper para simular delay de rede no modo mock ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Auth ---
export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      // 1. Tenta Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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
      console.warn("Supabase login falhou, tentando Mock...", err);
    }

    // 2. Fallback para Mock Data (Para testes imediatos)
    const mockUser = INITIAL_USERS.find(u => u.email === email && u.password === password);
    if (mockUser) {
      const safeUser = { ...mockUser };
      delete safeUser.password; // Remove senha antes de salvar
      localStorage.setItem('dicompel_user', JSON.stringify(safeUser));
      return safeUser;
    }
    
    return null;
  },
  
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('dicompel_user');
  },

  getCurrentUser: (): User | null => {
    try {
      const stored = localStorage.getItem('dicompel_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      localStorage.removeItem('dicompel_user');
      return null;
    }
  }
};

// --- Products ---
export const productService = {
  getAll: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      
      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          code: p.code,
          description: p.description,
          reference: p.reference,
          colors: p.colors || [],
          imageUrl: p.image_url,
          category: p.category,
          subcategory: p.subcategory,
          line: p.line
        }));
      }
    } catch (err) {
      console.warn("Erro Supabase Produtos:", err);
    }
    
    // Fallback Mock
    return INITIAL_PRODUCTS;
  },
  
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    // Tenta salvar no Supabase, se falhar apenas retorna o objeto (modo demo)
    try {
      const dbProduct = {
        code: product.code,
        description: product.description,
        reference: product.reference,
        colors: product.colors,
        image_url: product.imageUrl,
        category: product.category,
        subcategory: product.subcategory,
        line: product.line
      };
      const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
      if (!error && data) {
         return { ...product, id: data.id, imageUrl: data.image_url };
      }
    } catch(e) {}

    return { ...product, id: Math.random().toString(36).substr(2, 9) };
  },

  update: async (product: Product): Promise<void> => {
    try {
       const dbProduct = {
        code: product.code,
        description: product.description,
        reference: product.reference,
        colors: product.colors,
        image_url: product.imageUrl,
        category: product.category,
        subcategory: product.subcategory,
        line: product.line
      };
      await supabase.from('products').update(dbProduct).eq('id', product.id);
    } catch(e) {}
  },

  delete: async (id: string): Promise<void> => {
    try { await supabase.from('products').delete().eq('id', id); } catch(e) {}
  },

  importCSV: async (csvText: string): Promise<void> => {
    // Simulação de importação
    console.log("CSV Importado (Simulação):", csvText.substring(0, 50) + "...");
  }
};

// --- Orders ---
export const orderService = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (quantity, products (*)), interactions (*)`)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((order: any) => ({
          id: order.id,
          createdAt: order.created_at,
          status: order.status as OrderStatus,
          customerName: order.customer_name,
          customerContact: order.customer_contact,
          notes: order.notes,
          representativeId: order.representative_id,
          interactions: order.interactions || [],
          items: order.order_items ? order.order_items.map((item: any) => ({
             ...item.products,
             quantity: item.quantity,
             colors: item.products.colors || [],
             imageUrl: item.products.image_url
          })) : []
        }));
      }
    } catch (err) {}

    return INITIAL_ORDERS;
  },

  getByRep: async (repId: string): Promise<Order[]> => {
    const all = await orderService.getAll();
    return all.filter(o => o.representativeId === repId);
  },

  create: async (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'interactions'>): Promise<Order> => {
    try {
        const { data: orderData, error } = await supabase
          .from('orders')
          .insert([{
            representative_id: order.representativeId,
            customer_name: order.customerName,
            customer_contact: order.customerContact,
            notes: order.notes,
            status: OrderStatus.NEW
          }])
          .select().single();
          
        if (!error && orderData) {
            // In a real app we would insert items here
            return { ...order, id: orderData.id, status: OrderStatus.NEW, createdAt: new Date().toISOString(), interactions: [] };
        }
    } catch (e) {}
    
    // Mock Response
    return { ...order, id: Math.random().toString(36).substr(2, 9), status: OrderStatus.NEW, createdAt: new Date().toISOString(), interactions: [] };
  },

  update: async (order: Order): Promise<void> => {
    try { await supabase.from('orders').update({ status: order.status }).eq('id', order.id); } catch (e) {}
  },

  delete: async (id: string): Promise<void> => {
    try { await supabase.from('orders').delete().eq('id', id); } catch (e) {}
  }
};

// --- Users ---
export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
       const { data, error } = await supabase.from('profiles').select('*');
       if (!error && data && data.length > 0) {
         return data.map((p: any) => ({
           id: p.id,
           email: p.email,
           name: p.name,
           role: p.role as UserRole
         }));
       }
    } catch(e) {}
    return INITIAL_USERS;
  },

  getReps: async (): Promise<User[]> => {
    const users = await userService.getAll();
    return users.filter(u => u.role === UserRole.REPRESENTATIVE);
  },
  
  create: async (user: any): Promise<User> => {
      return { ...user, id: Math.random().toString(36).substr(2, 9) };
  },
  update: async (user: any): Promise<void> => {},
  delete: async (id: string): Promise<void> => {}
};