import { Product, User, Order, UserRole, OrderStatus, CartItem } from '../types';
import { supabase } from './supabaseClient';
import { INITIAL_PRODUCTS, INITIAL_USERS, INITIAL_ORDERS } from './mockData';

// --- Helper para simular delay de rede no modo mock ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const USERS_STORAGE_KEY = 'dicompel_users_db';

// Helper para gerenciar usuários locais
const getLocalUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalUsers = (users: User[]) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

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

    // 2. Tenta Usuários Criados Localmente (Admin Panel)
    const localUsers = getLocalUsers();
    const localUser = localUsers.find(u => u.email === email && u.password === password);
    if (localUser) {
       const safeUser = { ...localUser };
       // Não removemos a senha aqui pois o objeto localUser é referência, 
       // mas salvamos na sessão sem senha se quisermos ser puristas. 
       // Como é mock, mantemos simples.
       localStorage.setItem('dicompel_user', JSON.stringify(safeUser));
       return safeUser;
    }

    // 3. Fallback para Mock Data Estático (Para testes imediatos)
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
       // Tenta Supabase primeiro
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
    
    // Combina usuários estáticos (mockData) com usuários criados localmente (localStorage)
    const localUsers = getLocalUsers();
    
    // Filtra para não duplicar se IDs coincidirem (improvável com Math.random)
    const combined = [...INITIAL_USERS, ...localUsers];
    return combined;
  },

  getReps: async (): Promise<User[]> => {
    const users = await userService.getAll();
    return users.filter(u => u.role === UserRole.REPRESENTATIVE);
  },
  
  create: async (user: any): Promise<User> => {
      // Cria usuário com persistência local para login funcionar
      const newUser = { 
        ...user, 
        id: Math.random().toString(36).substr(2, 9) 
      };
      
      const currentUsers = getLocalUsers();
      saveLocalUsers([...currentUsers, newUser]);
      
      return newUser;
  },

  update: async (user: User): Promise<void> => {
    // Atualiza no LocalStorage
    const currentUsers = getLocalUsers();
    const index = currentUsers.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
      // Mantém a senha se não foi enviada uma nova, ou atualiza se foi
      const updatedUser = { 
        ...currentUsers[index], 
        ...user,
        password: (user as any).password || currentUsers[index].password 
      };
      
      currentUsers[index] = updatedUser;
      saveLocalUsers(currentUsers);
    } else {
      // Se não está no local, pode ser um estático (não editável neste mock simples) 
      // ou do supabase (não implementado update full aqui)
      console.warn("Usuário não encontrado no armazenamento local para edição.");
    }
  },

  delete: async (id: string): Promise<void> => {
    const currentUsers = getLocalUsers();
    const filtered = currentUsers.filter(u => u.id !== id);
    
    if (filtered.length !== currentUsers.length) {
      saveLocalUsers(filtered);
    } else {
      console.warn("Usuário não encontrado no armazenamento local para exclusão ou é um usuário estático.");
    }
  }
};