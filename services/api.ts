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
    
    // 1. Tenta Login no Supabase (Oficial)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user) {
        // Busca perfil adicional
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

    // 2. Fallback: Usuários de Teste (Apenas se o banco falhar/não existir)
    // Isso garante acesso administrativo inicial
    const mockUser = INITIAL_USERS.find(u => u.email.trim().toLowerCase() === cleanEmail && u.password === password);
    if (mockUser) {
      const safeUser = { ...mockUser };
      delete safeUser.password; // Não salvar senha no storage
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
    // ESTRATÉGIA: Database First.
    try {
      const { data, error } = await supabase.from('products').select('*');
      
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
        colors: product.colors, // Supabase aceita array se for coluna JSON/JSONB ou array
        image_url: product.imageUrl,
        category: product.category,
        subcategory: product.subcategory,
        line: product.line,
        amperage: product.amperage,
        details: product.details
      };
      
      const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
      
      if (error) {
        console.error("Erro detalhado do Supabase ao criar produto:", error);
        throw error;
      }

      if (data) {
         return { ...product, id: data.id, imageUrl: data.image_url };
      }
    } catch(e: any) {
        console.error("Exceção ao criar produto:", e);
        // Exibe erro mais amigável para o desenvolvedor no console
        const msg = e.message || "Erro desconhecido";
        alert(`Erro de Sincronização: Não foi possível salvar no banco de dados. Detalhe: ${msg}`);
        throw e;
    }
    throw new Error("Erro desconhecido ao criar produto.");
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
        alert("Erro ao atualizar no banco de dados.");
        throw e;
    }
  },

  delete: async (id: string): Promise<void> => {
    try { 
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
    } catch(e) {
        console.error("Erro ao deletar:", e);
        alert("Erro ao excluir do banco de dados.");
        throw e;
    }
  },

  importCSV: async (csvText: string): Promise<void> => {
    console.log("Importação CSV iniciada...");
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
                products (
                    id, code, description, reference, colors, image_url, category, subcategory, line, amperage, details
                )
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
          
        if (orderError) throw orderError;
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
            console.error("Erro ao salvar itens:", itemsError);
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
        alert("Erro ao enviar pedido para o servidor.");
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
        alert("Erro ao excluir pedido.");
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
      alert(`Erro ao criar usuário: ${err.message}`);
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
        alert("Erro ao atualizar usuário.");
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
        await supabase.from('orders').delete().eq('representative_id', id);
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (e: any) {
        console.error("Erro ao excluir usuário:", e);
        alert(`Erro ao excluir: ${e.message || "Erro desconhecido."}`);
        throw e;
    }
  }
};