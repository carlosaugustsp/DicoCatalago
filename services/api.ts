import { Product, User, Order, UserRole, OrderStatus, CartItem } from '../types';
import { supabase } from './supabaseClient';
import { INITIAL_USERS } from './mockData';

// --- CONSTANTES ---
const USERS_STORAGE_KEY = 'dicompel_users_db';
const PRODUCTS_STORAGE_KEY = 'dicompel_products_db';

// --- HELPERS ---
const getLocalData = <T>(key: string): T[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

// --- Auth Service ---
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
      console.warn("Erro de conexão no login, tentando fallback local...");
    }

    const mockUser = INITIAL_USERS.find(u => u.email.trim().toLowerCase() === cleanEmail && u.password === password);
    if (mockUser) {
      const safeUser = { ...mockUser };
      delete safeUser.password; 
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
      return null;
    }
  }
};

// --- Product Service ---
export const productService = {
  getAll: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('description');
      
      if (!error && data) {
        return data.map((p: any) => ({
          id: p.id,
          code: p.code,
          description: p.description,
          reference: p.reference,
          colors: Array.isArray(p.colors) ? p.colors : [],
          imageUrl: p.image_url,
          category: p.category,
          subcategory: p.subcategory,
          line: p.line,
          amperage: p.amperage,
          details: p.details 
        }));
      }
    } catch (err) {
       console.error("Erro ao buscar produtos do Supabase:", err);
    }
    return getLocalData<Product>(PRODUCTS_STORAGE_KEY);
  },
  
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    try {
      const dbProduct = {
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
      };
      
      const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
      
      if (error) {
        console.error("Erro Supabase Insert Product:", error);
        throw error;
      }
      return { ...product, id: data.id, imageUrl: data.image_url };
    } catch(e: any) {
        console.error("Exceção ao criar produto:", e);
        throw e;
    }
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
        line: product.line,
        amperage: product.amperage,
        details: product.details 
      };
      const { error } = await supabase.from('products').update(dbProduct).eq('id', product.id);
      if (error) throw error;
    } catch(e) {
        console.error("Erro ao atualizar:", e);
        throw e;
    }
  },

  delete: async (id: string): Promise<void> => {
    try { 
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
    } catch(e) {
        console.error("Erro ao deletar:", e);
        throw e;
    }
  },

  importCSV: async (csvText: string): Promise<void> => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const productsToInsert = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const values = line.split(regex);
      const row: any = {};
      
      headers.forEach((header, index) => {
        let val = values[index]?.trim() || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        row[header] = val;
      });

      productsToInsert.push({
        code: row.code || row.id || `CSV-${Date.now()}-${i}`,
        description: row.description || 'Produto Sem Descrição',
        reference: row.reference || '',
        colors: row.colors ? row.colors.split('|').map((c: string) => c.trim()) : [],
        image_url: row.imageurl || row.image_url || `https://picsum.photos/400/400?random=${i}`,
        category: row.category || 'Geral',
        subcategory: row.subcategory || '',
        line: row.line || '',
        amperage: row.amperage || '',
        details: row.details || ''
      });
    }

    if (productsToInsert.length > 0) {
      const { error } = await supabase.from('products').upsert(productsToInsert, { onConflict: 'code' });
      if (error) {
        console.error("Erro na importação CSV:", error);
        throw error;
      }
    }
  }
};

// --- Order Service ---
export const orderService = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
            *, 
            order_items (
                quantity, 
                products (*)
            ), 
            interactions (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        return data.map((order: any) => ({
          id: order.id,
          createdAt: order.created_at,
          status: order.status as OrderStatus,
          customerName: order.customer_name,
          customerContact: order.customer_contact,
          notes: order.notes,
          representativeId: order.representative_id,
          interactions: order.interactions || [],
          items: order.order_items ? order.order_items.map((item: any) => {
             const prod = item.products || { description: "Produto Excluído", code: "---" };
             return {
                 id: prod.id,
                 code: prod.code,
                 description: prod.description,
                 reference: prod.reference,
                 colors: Array.isArray(prod.colors) ? prod.colors : [],
                 imageUrl: prod.image_url,
                 category: prod.category,
                 subcategory: prod.subcategory,
                 line: prod.line,
                 amperage: prod.amperage,
                 details: prod.details,
                 quantity: item.quantity
             };
          }) : []
        }));
      }
    } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
    }
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
            customer_contact: order.customerContact,
            notes: order.notes,
            status: OrderStatus.NEW
          }])
          .select()
          .single();
          
        if (orderError) {
          console.error("Erro Supabase Insert Order:", orderError);
          throw orderError;
        }
        if (!orderData) throw new Error("Falha ao criar ID do pedido");

        const itemsToInsert = order.items.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            quantity: item.quantity
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) {
          console.error("Erro Supabase Insert Order Items:", itemsError);
          throw itemsError;
        }

        return { 
            ...order, 
            id: orderData.id, 
            status: OrderStatus.NEW, 
            createdAt: orderData.created_at, 
            interactions: [] 
        };

    } catch (e) {
        console.error("Erro ao criar pedido:", e);
        throw e;
    }
  },

  update: async (order: Order): Promise<void> => {
    try { 
        await supabase.from('orders').update({ 
            status: order.status,
            notes: order.notes 
        }).eq('id', order.id);
    } catch (e) {
        console.error(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try { 
        await supabase.from('orders').delete().eq('id', id); 
    } catch (e) {
        console.error(e);
    }
  }
};

// --- User Service ---
export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
       const { data, error } = await supabase.from('profiles').select('*');
       if (!error && data) {
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
    try {
      if (user.password && user.email) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              name: user.name,
              role: user.role
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([{
              id: authData.user.id,
              name: user.name,
              email: user.email,
              role: user.role
            }]);
            
          if (profileError) throw profileError;
          
          return { ...user, id: authData.user.id };
        }
      }
      throw new Error("Dados incompletos.");
    } catch (err: any) {
      console.error("Erro Supabase Auth:", err);
      throw err;
    }
  },

  update: async (user: User): Promise<void> => {
    try {
       await supabase.from('profiles').update({
         name: user.name,
         role: user.role
       }).eq('id', user.id);
    } catch (e) {
        console.error(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
    } catch (e: any) {
        console.error("Erro ao excluir usuário:", e);
        throw e;
    }
  }
};