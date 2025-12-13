import { Product, User, Order, UserRole, OrderStatus, CartItem } from '../types';
import { supabase } from './supabaseClient';
import { INITIAL_PRODUCTS, INITIAL_USERS, INITIAL_ORDERS } from './mockData';

// --- CONSTANTES DE ARMAZENAMENTO ---
const USERS_STORAGE_KEY = 'dicompel_users_db';
const PRODUCTS_STORAGE_KEY = 'dicompel_products_db';
const DELETED_IDS_KEY = 'dicompel_deleted_ids'; // Lista negra de IDs excluídos (Users e Products)

// --- HELPERS GENÉRICOS ---

// Gerencia IDs excluídos
const getDeletedIds = (): string[] => {
  try {
    const stored = localStorage.getItem(DELETED_IDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const markAsDeleted = (id: string) => {
  const current = getDeletedIds();
  if (!current.includes(id)) {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...current, id]));
  }
};

// --- HELPERS DE USUÁRIO ---
const getLocalUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};
const saveLocalUsers = (users: User[]) => localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

// --- HELPERS DE PRODUTOS ---
const getLocalProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};
const saveLocalProducts = (products: Product[]) => localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));


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
      // Silently ignore login errors to fallback
    }

    // 2. Tenta Usuários Criados Localmente (Admin Panel)
    const localUsers = getLocalUsers();
    const localUser = localUsers.find(u => u.email === email && u.password === password);
    
    // Verifica se não foi excluído
    const deletedIds = getDeletedIds();
    
    if (localUser && !deletedIds.includes(localUser.id)) {
       const safeUser = { ...localUser };
       localStorage.setItem('dicompel_user', JSON.stringify(safeUser));
       return safeUser;
    }

    // 3. Fallback para Mock Data Estático
    const mockUser = INITIAL_USERS.find(u => u.email === email && u.password === password);
    if (mockUser && !deletedIds.includes(mockUser.id)) {
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
      localStorage.removeItem('dicompel_user');
      return null;
    }
  }
};

// --- Products ---
export const productService = {
  getAll: async (): Promise<Product[]> => {
    const deletedIds = getDeletedIds();
    let allProducts: Product[] = [];

    // 1. Tenta buscar do Supabase
    try {
      const { data, error } = await supabase.from('products').select('*');
      
      if (!error && data && data.length > 0) {
        const dbProducts = data.map((p: any) => ({
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
        allProducts = [...dbProducts];
      }
    } catch (err) {
       // Ignora erro de rede/supa
    }

    // 2. Mescla com Produtos Locais (criados offline)
    const localProducts = getLocalProducts();
    localProducts.forEach(localP => {
        // Evita duplicatas se já veio do banco (por ID ou Código)
        if (!allProducts.some(p => p.id === localP.id || p.code === localP.code)) {
            allProducts.push(localP);
        }
    });

    // 3. Mescla com Mock Data (se não tiver no banco nem local)
    INITIAL_PRODUCTS.forEach(mockP => {
        if (!allProducts.some(p => p.code === mockP.code)) {
            allProducts.push(mockP);
        }
    });
    
    // Filtra excluídos
    return allProducts.filter(p => !deletedIds.includes(p.id));
  },
  
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    let savedInCloud = false;
    let cloudProduct: Product | null = null;

    // 1. Tenta salvar no Supabase
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
         savedInCloud = true;
         cloudProduct = { ...product, id: data.id, imageUrl: data.image_url };
      }
    } catch(e) {
        console.warn("Falha ao salvar produto no Supabase.");
    }

    if (savedInCloud && cloudProduct) {
        return cloudProduct;
    }

    // 2. Fallback: Salva Localmente (SEMPRE executa se a nuvem falhar)
    console.log("Salvando produto localmente (LocalStorage)...");
    const newProduct = { 
        ...product, 
        id: Math.random().toString(36).substr(2, 9) // ID curto indica local
    };
    
    const currentLocals = getLocalProducts();
    saveLocalProducts([...currentLocals, newProduct]);

    return newProduct;
  },

  update: async (product: Product): Promise<void> => {
    // 1. Atualiza localmente se existir
    const currentLocals = getLocalProducts();
    const index = currentLocals.findIndex(p => p.id === product.id);
    
    if (index !== -1) {
        currentLocals[index] = product;
        saveLocalProducts(currentLocals);
    }

    // 2. Tenta atualizar no Supabase (apenas se for ID longo/UUID)
    if (product.id.length > 10) {
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
    }
  },

  delete: async (id: string): Promise<void> => {
    // 1. Marca como excluído globalmente
    markAsDeleted(id);

    // 2. Remove do local storage se existir
    const currentLocals = getLocalProducts();
    const filtered = currentLocals.filter(p => p.id !== id);
    if (filtered.length !== currentLocals.length) {
        saveLocalProducts(filtered);
    }

    // 3. Tenta remover do Supabase
    if (id.length > 10) {
        try { await supabase.from('products').delete().eq('id', id); } catch(e) {}
    }
  },

  importCSV: async (csvText: string): Promise<void> => {
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
            return { ...order, id: orderData.id, status: OrderStatus.NEW, createdAt: new Date().toISOString(), interactions: [] };
        }
    } catch (e) {}
    
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
    const deletedIds = getDeletedIds();
    let allUsers: User[] = [];

    // 1. Supabase
    try {
       const { data, error } = await supabase.from('profiles').select('*');
       if (!error && data && data.length > 0) {
         allUsers = data.map((p: any) => ({
           id: p.id,
           email: p.email,
           name: p.name,
           role: p.role as UserRole
         }));
       }
    } catch(e) {}
    
    // 2. Mock Data
    INITIAL_USERS.forEach(mockUser => {
       if (!allUsers.some(u => u.email === mockUser.email)) {
          allUsers.push(mockUser);
       }
    });

    // 3. Local Storage
    const localUsers = getLocalUsers();
    localUsers.forEach(localUser => {
        if (!allUsers.some(u => u.email === localUser.email)) {
           allUsers.push(localUser);
        }
    });
    
    // Filtrar os excluídos
    return allUsers.filter(u => !deletedIds.includes(u.id));
  },

  getReps: async (): Promise<User[]> => {
    const users = await userService.getAll();
    return users.filter(u => u.role === UserRole.REPRESENTATIVE);
  },
  
  create: async (user: any): Promise<User> => {
    // Tenta criar no Supabase (Auth + Tabela Profiles)
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

        if (!authError && authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              name: user.name,
              email: user.email,
              role: user.role
            }]);
            
          if (!profileError) {
             return { ...user, id: authData.user.id };
          }
        }
      }
    } catch (err) {
      console.error("Falha ao integrar criação de usuário com Supabase:", err);
    }

    // Fallback: Cria usuário localmente
    const newUser = { 
      ...user, 
      id: Math.random().toString(36).substr(2, 9) 
    };
    
    const currentUsers = getLocalUsers();
    saveLocalUsers([...currentUsers, newUser]);
    
    return newUser;
  },

  update: async (user: User): Promise<void> => {
    const currentUsers = getLocalUsers();
    const index = currentUsers.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
      const updatedUser = { 
        ...currentUsers[index], 
        ...user,
        password: (user as any).password || currentUsers[index].password 
      };
      
      currentUsers[index] = updatedUser;
      saveLocalUsers(currentUsers);
    } 
    
    try {
       await supabase.from('profiles').update({
         name: user.name,
         role: user.role
       }).eq('id', user.id);
    } catch (e) {}
  },

  delete: async (id: string): Promise<void> => {
    // 1. Marca como excluído globalmente (para não reaparecer do Mock/Supabase)
    markAsDeleted(id);

    // 2. Remove do armazenamento local se existir
    const currentUsers = getLocalUsers();
    const filtered = currentUsers.filter(u => u.id !== id);
    if (filtered.length !== currentUsers.length) {
       saveLocalUsers(filtered);
    }
    
    // 3. Tenta deletar do Supabase (Apenas profile)
    try {
      await supabase.from('profiles').delete().eq('id', id);
    } catch (e) {}
  }
};